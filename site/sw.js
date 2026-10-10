/* PaceLab Cricket service worker: makes the app work offline. It only ever touches files from its own origin
   and never sends user data anywhere. Bump VERSION whenever index.html changes so old caches are removed. */
const VERSION = 'pacelab-0.3.1';
// Pose-model files (about 12 MB, fetched only the first time Biomechanics Analysis is used) live in their own cache so a new app version does not download them again.
const MODELS = 'pacelab-models-1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== MODELS).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  if (r.mode === 'navigate') {
    // Only the app page itself is handled here. Anything else opened by navigation (for example a downloaded file) goes straight to the network and is never cached.
    const p = new URL(r.url).pathname;
    if (!(p.endsWith('/') || p.endsWith('/index.html'))) return;
    // Network first so a new version arrives when online; fall back to the cached page when offline.
    e.respondWith(fetch(r).then((res) => {
      if (res.ok && /text\/html/i.test(res.headers.get('content-type') || '')) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put('index.html', copy)); }
      return res;
    }).catch(() => caches.match('index.html')));
    return;
  }
  if (new URL(r.url).pathname.indexOf('/vendor/') >= 0) {
    e.respondWith(caches.open(MODELS).then((c) => c.match(r).then((hit) => hit || fetch(r).then((res) => { if (res.ok && res.status === 200 && !r.headers.get('range')) c.put(r, res.clone()); return res; }))));
    return;
  }
  e.respondWith(caches.match(r).then((hit) => hit || fetch(r)));
});
