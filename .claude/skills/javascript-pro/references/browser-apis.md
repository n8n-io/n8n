# Browser APIs

## Fetch API

```javascript
// Basic GET request
const response = await fetch('/api/users');
const data = await response.json();

// POST with JSON
const response = await fetch('/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ name: 'John', email: 'john@example.com' })
});

// Error handling
const fetchWithErrorHandling = async (url) => {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError') {
      console.error('Network error or CORS issue');
    }
    throw error;
  }
};

// Abort requests
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);

const response = await fetch('/api/data', {
  signal: controller.signal
});

// File upload with progress
const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  return fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
};
```

## Web Workers

```javascript
// main.js - Create and communicate with worker
const worker = new Worker('/worker.js');

worker.postMessage({ command: 'process', data: largeArray });

worker.onmessage = (event) => {
  console.log('Result from worker:', event.data);
};

worker.onerror = (error) => {
  console.error('Worker error:', error.message);
};

// Terminate when done
worker.terminate();

// worker.js - Worker code
self.onmessage = (event) => {
  const { command, data } = event.data;

  if (command === 'process') {
    const result = processLargeData(data);
    self.postMessage(result);
  }
};

function processLargeData(data) {
  // CPU-intensive work
  return data.map(x => x * 2).reduce((a, b) => a + b, 0);
}

// Shared Worker (shared between tabs)
const sharedWorker = new SharedWorker('/shared-worker.js');

sharedWorker.port.onmessage = (event) => {
  console.log('Shared worker message:', event.data);
};

sharedWorker.port.postMessage({ type: 'init' });
```

## Service Workers & PWA

```javascript
// Register Service Worker
if ('serviceWorker' in navigator) {
  const registration = await navigator.serviceWorker.register('/sw.js');
  console.log('SW registered:', registration);

  // Update service worker
  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'activated') {
        window.location.reload();
      }
    });
  });
}

// sw.js - Service Worker
const CACHE_NAME = 'v1';
const urlsToCache = ['/index.html', '/styles.css', '/app.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }

      // Clone request
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});
```

## Local Storage & IndexedDB

```javascript
// LocalStorage (synchronous, max 5-10MB)
localStorage.setItem('theme', 'dark');
const theme = localStorage.getItem('theme');
localStorage.removeItem('theme');
localStorage.clear();

// SessionStorage (per-tab)
sessionStorage.setItem('token', '<token>');

// IndexedDB (asynchronous, larger storage)
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('myDatabase', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const objectStore = db.createObjectStore('users', { keyPath: 'id' });
      objectStore.createIndex('email', 'email', { unique: true });
    };
  });
};

const addUser = async (user) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['users'], 'readwrite');
    const objectStore = transaction.objectStore('users');
    const request = objectStore.add(user);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getUser = async (id) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['users']);
    const objectStore = transaction.objectStore('users');
    const request = objectStore.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};
```

## Intersection Observer

```javascript
// Lazy loading images
const imageObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.add('loaded');
        observer.unobserve(img);
      }
    });
  },
  {
    root: null, // viewport
    rootMargin: '50px',
    threshold: 0.1
  }
);

document.querySelectorAll('img[data-src]').forEach((img) => {
  imageObserver.observe(img);
});

// Infinite scroll
const loadMoreObserver = new IntersectionObserver(
  (entries) => {
    const lastEntry = entries[0];
    if (lastEntry.isIntersecting) {
      loadMoreItems();
    }
  },
  { threshold: 1.0 }
);

const sentinel = document.querySelector('#load-more-sentinel');
loadMoreObserver.observe(sentinel);
```

## Mutation Observer

```javascript
// Watch DOM changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      console.log('Nodes added/removed:', mutation.addedNodes, mutation.removedNodes);
    } else if (mutation.type === 'attributes') {
      console.log('Attribute changed:', mutation.attributeName);
    }
  });
});

observer.observe(document.body, {
  childList: true,
  attributes: true,
  subtree: true,
  attributeOldValue: true
});

// Disconnect when done
observer.disconnect();
```

## Web Notifications

```javascript
// Request permission
const permission = await Notification.requestPermission();

if (permission === 'granted') {
  new Notification('Hello!', {
    body: 'This is a notification',
    icon: '/icon.png',
    tag: 'unique-tag',
    requireInteraction: false
  });
}

// Service Worker notifications
// sw.js
self.addEventListener('push', (event) => {
  const data = event.data.json();

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: '/badge.png',
      data: data.url
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
```

## Canvas & WebGL

```javascript
// Canvas 2D
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

// Draw rectangle
ctx.fillStyle = '#FF0000';
ctx.fillRect(10, 10, 100, 100);

// Draw text
ctx.font = '30px Arial';
ctx.fillText('Hello Canvas', 10, 50);

// Draw image
const img = new Image();
img.onload = () => {
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
};
img.src = '/image.png';

// WebGL basic setup
const gl = canvas.getContext('webgl2');

if (!gl) {
  console.error('WebGL2 not supported');
}

// Clear canvas
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);
```

## Performance APIs

```javascript
// Performance timing
const timing = performance.timing;
const loadTime = timing.loadEventEnd - timing.navigationStart;
console.log('Page load time:', loadTime);

// Performance Observer
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.duration}ms`);
  }
});

observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });

// Custom marks and measures
performance.mark('start-fetch');
await fetch('/api/data');
performance.mark('end-fetch');
performance.measure('fetch-duration', 'start-fetch', 'end-fetch');

const measures = performance.getEntriesByType('measure');
console.log(measures);
```

## Quick Reference

| API | Use Case | Browser Support |
|-----|----------|----------------|
| Fetch | HTTP requests | Modern browsers |
| Web Workers | CPU-intensive tasks | Modern browsers |
| Service Workers | Offline, caching | Modern browsers |
| IndexedDB | Large client storage | Modern browsers |
| IntersectionObserver | Lazy loading, infinite scroll | Modern browsers |
| MutationObserver | DOM change detection | Modern browsers |
| Notifications | User alerts | Modern browsers (permission) |
| Canvas | 2D graphics | All browsers |
| WebGL | 3D graphics | Modern browsers |
