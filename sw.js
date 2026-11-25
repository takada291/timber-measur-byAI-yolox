const CACHE_NAME = 'ai-log-detect-yolox-v0.1';
const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './icon-512.png',
    './yolox_tiny_log.onnx',
    'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.wasm.min.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                PRECACHE_URLS.map((url) => cache.add(url))
            );
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    const isSameOrigin = (url.origin === self.location.origin);
    const isOrtCdn = url.href.startsWith('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/');

    // 同一オリジン（HTML/ONNX等）および ONNX Runtime Web の WASM ファイルはキャッシュ優先
    if (isSameOrigin || isOrtCdn) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    if (response && (response.status === 200 || response.type === 'opaque')) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                    }
                    return response;
                });
            })
        );
    }
});