# Asynchronous Patterns

## Promise Patterns

```javascript
// Promise creation
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithTimeout = (url, timeout = 5000) => {
  return Promise.race([
    fetch(url),
    delay(timeout).then(() => Promise.reject(new Error('Timeout')))
  ]);
};

// Promise composition
const fetchUserData = async (userId) => {
  const user = await fetch(`/api/users/${userId}`).then(r => r.json());
  const posts = await fetch(`/api/users/${userId}/posts`).then(r => r.json());
  return { user, posts };
};
```

## Async/Await Best Practices

```javascript
// Parallel execution with Promise.all
const fetchAllData = async () => {
  const [users, posts, comments] = await Promise.all([
    fetch('/api/users').then(r => r.json()),
    fetch('/api/posts').then(r => r.json()),
    fetch('/api/comments').then(r => r.json())
  ]);
  return { users, posts, comments };
};

// Sequential when order matters
const processSteps = async () => {
  const step1 = await executeStep1();
  const step2 = await executeStep2(step1);
  const step3 = await executeStep3(step2);
  return step3;
};

// Conditional parallel execution
const loadUserProfile = async (userId, includeHistory = false) => {
  const userPromise = fetchUser(userId);
  const settingsPromise = fetchSettings(userId);

  const promises = [userPromise, settingsPromise];
  if (includeHistory) {
    promises.push(fetchHistory(userId));
  }

  const [user, settings, history] = await Promise.all(promises);
  return { user, settings, history };
};
```

## Error Handling Strategies

```javascript
// Try-catch with specific error handling
const safeApiCall = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError') {
      console.error('Network error:', error);
    } else if (error.name === 'SyntaxError') {
      console.error('Invalid JSON:', error);
    }
    throw error;
  }
};

// Custom error classes
class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const fetchApi = async (endpoint) => {
  const response = await fetch(endpoint);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(response.status, response.statusText, data);
  }
  return response.json();
};

// Retry logic with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.min(1000 * 2 ** i, 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

## Promise Combinators

```javascript
// Promise.allSettled - wait for all, regardless of rejection
const results = await Promise.allSettled([
  fetch('/api/users'),
  fetch('/api/posts'),
  fetch('/api/invalid')
]);

results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    console.log(`Success ${index}:`, result.value);
  } else {
    console.error(`Failed ${index}:`, result.reason);
  }
});

// Promise.any - first successful result
const fastestMirror = await Promise.any([
  fetch('https://mirror1.example.com/data'),
  fetch('https://mirror2.example.com/data'),
  fetch('https://mirror3.example.com/data')
]);

// Promise.race - first settled (resolved or rejected)
const raceResult = await Promise.race([
  fetchFromCache(),
  fetchFromNetwork()
]);
```

## Async Generators

```javascript
// Async generator for pagination
async function* fetchPaginatedData(baseUrl) {
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(`${baseUrl}?page=${page}`);
    const data = await response.json();

    yield data.items;

    hasMore = data.hasMore;
    page++;
  }
}

// Usage
for await (const items of fetchPaginatedData('/api/items')) {
  processItems(items);
}

// Async generator with error handling
async function* streamWithRetry(source) {
  let retries = 3;

  while (retries > 0) {
    try {
      for await (const chunk of source) {
        yield chunk;
      }
      break;
    } catch (error) {
      retries--;
      if (retries === 0) throw error;
      await delay(1000);
    }
  }
}
```

## Concurrent Queue Management

```javascript
// Limit concurrent operations
class AsyncQueue {
  #queue = [];
  #running = 0;
  #maxConcurrent;

  constructor(maxConcurrent = 3) {
    this.#maxConcurrent = maxConcurrent;
  }

  async run(fn) {
    while (this.#running >= this.#maxConcurrent) {
      await new Promise(resolve => this.#queue.push(resolve));
    }

    this.#running++;
    try {
      return await fn();
    } finally {
      this.#running--;
      const resolve = this.#queue.shift();
      if (resolve) resolve();
    }
  }
}

// Usage
const queue = new AsyncQueue(2);
const results = await Promise.all(
  urls.map(url => queue.run(() => fetch(url)))
);
```

## Event Loop Understanding

```javascript
// Microtasks vs Macrotasks
console.log('1: Synchronous');

setTimeout(() => console.log('2: Macrotask (setTimeout)'), 0);

Promise.resolve().then(() => console.log('3: Microtask (Promise)'));

queueMicrotask(() => console.log('4: Microtask (queueMicrotask)'));

console.log('5: Synchronous');

// Output order: 1, 5, 3, 4, 2

// Avoid blocking the event loop
const processLargeArray = async (items) => {
  const results = [];
  const chunkSize = 100;

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    results.push(...chunk.map(processItem));

    // Yield to event loop
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return results;
};
```

## AbortController for Cancellation

```javascript
// Abort fetch requests
const controller = new AbortController();
const { signal } = controller;

setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch('/api/data', { signal });
  const data = await response.json();
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Request aborted');
  }
}

// Abort multiple operations
const multiAbort = async () => {
  const controller = new AbortController();

  try {
    const [users, posts] = await Promise.all([
      fetch('/api/users', { signal: controller.signal }),
      fetch('/api/posts', { signal: controller.signal })
    ]);
  } catch (error) {
    controller.abort();
    throw error;
  }
};
```

## Stream Processing

```javascript
// Process ReadableStream
const processStream = async (url) => {
  const response = await fetch(url);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    result += decoder.decode(value, { stream: true });
  }

  return result;
};

// Transform streams
const transformStream = new TransformStream({
  transform(chunk, controller) {
    const transformed = chunk.toString().toUpperCase();
    controller.enqueue(transformed);
  }
});

const response = await fetch('/data');
const transformed = response.body.pipeThrough(transformStream);
```

## Quick Reference

| Pattern | Use Case | Example |
|---------|----------|---------|
| `Promise.all()` | Parallel, fail-fast | `await Promise.all([p1, p2])` |
| `Promise.allSettled()` | Parallel, all results | `await Promise.allSettled([p1, p2])` |
| `Promise.race()` | First to complete | `await Promise.race([p1, p2])` |
| `Promise.any()` | First to succeed | `await Promise.any([p1, p2])` |
| `async function*` | Async iteration | `for await (const x of gen())` |
| `AbortController` | Cancellation | `fetch(url, { signal })` |
| `queueMicrotask()` | Priority microtask | `queueMicrotask(fn)` |
