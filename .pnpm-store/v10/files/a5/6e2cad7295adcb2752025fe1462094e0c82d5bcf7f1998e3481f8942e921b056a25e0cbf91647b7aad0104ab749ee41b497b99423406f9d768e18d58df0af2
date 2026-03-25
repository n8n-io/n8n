# Abort Controller Extras [![npm version][npm-image]][npm-url]

Abortable async function primitives and combinators.

- [Installation](#installation)
- [Abort Controller](#abort-controller)
- [Abortable Functions](#abortable-functions)
- [Composing Abortable Functions](#composing-abortable-functions)
- [Companion Packages](#companion-packages)
- [API](#api)
  - [`all`](#all)
  - [`race`](#race)
  - [`delay`](#delay)
  - [`waitForEvent`](#waitforevent)
  - [`forever`](#forever)
  - [`spawn`](#spawn)
  - [`retry`](#retry)
  - [`proactiveRetry`](#proactive-retry)
  - [`execute`](#execute)
  - [`abortable`](#abortable)
  - [`run`](#run)
  - [`AbortError`](#aborterror)
  - [`isAbortError`](#isaborterror)
  - [`throwIfAborted`](#throwifaborted)
  - [`rethrowAbortError`](#rethrowaborterror)
  - [`catchAbortError`](#catchaborterror)

## Installation

```
yarn add abort-controller-x
```

## Abort Controller

See
[`AbortController` MDN page](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
AbortController is
[available in NodeJS](https://nodejs.org/api/globals.html#class-abortcontroller)
since 15.0.0, NodeJS 14.17+ requires the
[--experimental-abortcontroller](https://nodejs.org/docs/latest-v14.x/api/cli.html#cli_experimental_abortcontroller)
flag. A [polyfill](https://www.npmjs.com/package/abort-controller) is available
for older NodeJS versions and browsers.

## Abortable Functions

We define _abortable function_ as a function that obeys following rules:

- It must accept `AbortSignal` in its arguments.
- It must return a `Promise`.
- It must add
  [`abort`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/abort_event)
  event listener to the `AbortSignal`. Once the `AbortSignal` is aborted, the
  returned `Promise` must reject with `AbortError` either immediately, or after
  doing any async cleanup. It's also possible to reject with other errors that
  happen during cleanup.
- Once the returned `Promise` is fulfilled or rejected, it must remove
  [`abort`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/abort_event)
  event listener.

An example of _abortable function_ is the standard
[`fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) function.

## Composing Abortable Functions

This library provides a way to build complex abortable functions using standard
`async`/`await` syntax, without the burden of manually managing
[`abort`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/abort_event)
event listeners. You can reuse a single `AbortSignal` between many operations
inside a parent function:

```ts
/**
 * Make requests repeatedly with a delay between consecutive requests
 */
async function makeRequests(signal: AbortSignal): Promise<never> {
  while (true) {
    await fetch('...', {signal});
    await delay(signal, 1000);
  }
}

const abortController = new AbortController();

makeRequests(abortController.signal).catch(catchAbortError);

process.on('SIGTERM', () => {
  abortController.abort();
});
```

The above example can be rewritten in a more ergonomic way using [`run`](#run)
helper.

Usually you should only create `AbortController` somewhere on the top level, and
in regular code use `async`/`await` and pass `AbortSignal` to abortable
functions provided by this library or custom ones composed of other abortable
functions.

## Companion Packages

- [`abort-controller-x-rxjs`](https://github.com/deeplay-io/abort-controller-x-rxjs)
  — Abortable helpers for RxJS.

## API

### `all`

```ts
function all<T>(
  signal: AbortSignal,
  executor: (innerSignal: AbortSignal) => readonly PromiseLike<T>[],
): Promise<T[]>;
```

Abortable version of `Promise.all`.

Creates new inner `AbortSignal` and passes it to `executor`. That signal is
aborted when `signal` is aborted or any of the promises returned from `executor`
are rejected.

Returns a promise that fulfills with an array of results when all of the
promises returned from `executor` fulfill, rejects when any of the promises
returned from `executor` are rejected, and rejects with `AbortError` when
`signal` is aborted.

The promises returned from `executor` must be abortable, i.e. once `innerSignal`
is aborted, they must reject with `AbortError` either immediately, or after
doing any async cleanup.

Example:

```ts
const [result1, result2] = await all(signal, signal => [
  makeRequest(signal, params1),
  makeRequest(signal, params2),
]);
```

### `race`

```ts
function race<T>(
  signal: AbortSignal,
  executor: (innerSignal: AbortSignal) => readonly PromiseLike<T>[],
): Promise<T>;
```

Abortable version of `Promise.race`.

Creates new inner `AbortSignal` and passes it to `executor`. That signal is
aborted when `signal` is aborted or any of the promises returned from `executor`
are fulfilled or rejected.

Returns a promise that fulfills or rejects when any of the promises returned
from `executor` are fulfilled or rejected, and rejects with `AbortError` when
`signal` is aborted.

The promises returned from `executor` must be abortable, i.e. once `innerSignal`
is aborted, they must reject with `AbortError` either immediately, or after
doing any async cleanup.

Example:

```ts
const result = await race(signal, signal => [
  delay(signal, 1000).then(() => ({status: 'timeout'})),
  makeRequest(signal, params).then(value => ({status: 'success', value})),
]);

if (result.status === 'timeout') {
  // request timed out
} else {
  const response = result.value;
}
```

### `delay`

```ts
function delay(signal: AbortSignal, dueTime: number | Date): Promise<void>;
```

Return a promise that resolves after delay and rejects with `AbortError` once
`signal` is aborted.

The delay time is specified as a `Date` object or as an integer denoting
milliseconds to wait.

Example:

```ts
// Make a request repeatedly with a delay between consecutive requests
while (true) {
  await makeRequest(signal, params);
  await delay(signal, 1000);
}
```

Example:

```ts
// Make a request repeatedly with a fixed interval
import {addMilliseconds} from 'date-fns';

let date = new Date();

while (true) {
  await makeRequest(signal, params);

  date = addMilliseconds(date, 1000);
  await delay(signal, date);
}
```

### `waitForEvent`

```ts
function waitForEvent<T>(
  signal: AbortSignal,
  target: EventTargetLike<T>,
  eventName: string,
  options?: EventListenerOptions,
): Promise<T>;
```

Returns a promise that fulfills when an event of specific type is emitted from
given event target and rejects with `AbortError` once `signal` is aborted.

Example:

```ts
// Create a WebSocket and wait for connection
const webSocket = new WebSocket(url);

const openEvent = await race(signal, signal => [
  waitForEvent<WebSocketEventMap['open']>(signal, webSocket, 'open'),
  waitForEvent<WebSocketEventMap['close']>(signal, webSocket, 'close').then(
    event => {
      throw new Error(`Failed to connect to ${url}: ${event.reason}`);
    },
  ),
]);
```

### `forever`

```ts
function forever(signal: AbortSignal): Promise<never>;
```

Return a promise that never fulfills and only rejects with `AbortError` once
`signal` is aborted.

### `spawn`

```ts
function spawn<T>(
  signal: AbortSignal,
  fn: (signal: AbortSignal, effects: SpawnEffects) => Promise<T>,
): Promise<T>;

type SpawnEffects = {
  defer(fn: () => void | Promise<void>): void;
  fork<T>(fn: (signal: AbortSignal) => Promise<T>): ForkTask<T>;
};

type ForkTask<T> = {
  abort(): void;
  join(): Promise<T>;
};
```

Run an abortable function with `fork` and `defer` effects attached to it.

`spawn` allows to write Go-style coroutines.

- `SpawnEffects.defer`

  Schedules a function to run after spawned function finishes.

  Deferred functions run serially in last-in-first-out order.

  Promise returned from `spawn` resolves or rejects only after all deferred
  functions finish.

- `SpawnEffects.fork`

  Executes an abortable function in background.

  If a forked function throws an exception, spawned function and other forks are
  aborted and promise returned from `spawn` rejects with that exception.

  When spawned function finishes, all forks are aborted.

- `ForkTask.abort`

  Abort a forked function.

- `ForkTask.join`

  Returns a promise returned from a forked function.

Example:

```ts
// Connect to a database, then start a server, then block until abort.
// On abort, gracefully shutdown the server, and once done, disconnect
// from the database.
spawn(signal, async (signal, {defer}) => {
  const db = await connectToDb();

  defer(async () => {
    await db.close();
  });

  const server = await startServer(db);

  defer(async () => {
    await server.close();
  });

  await forever(signal);
});
```

Example:

```ts
// Connect to a database, then start an infinite polling loop.
// On abort, disconnect from the database.
spawn(signal, async (signal, {defer}) => {
  const db = await connectToDb();

  defer(async () => {
    await db.close();
  });

  while (true) {
    await poll(signal, db);
    await delay(signal, 5000);
  }
});
```

Example:

```ts
// Acquire a lock and execute a function.
// Extend the lock while the function is running.
// Once the function finishes or the signal is aborted, stop extending
// the lock and release it.
import Redlock = require('redlock');

const lockTtl = 30_000;

function withLock<T>(
  signal: AbortSignal,
  redlock: Redlock,
  key: string,
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  return spawn(signal, async (signal, {fork, defer}) => {
    const lock = await redlock.lock(key, lockTtl);

    defer(() => lock.unlock());

    fork(async signal => {
      while (true) {
        await delay(signal, lockTtl / 10);
        await lock.extend(lockTtl);
      }
    });

    return await fn(signal);
  });
}

const redlock = new Redlock([redis], {
  retryCount: -1,
});

await withLock(signal, redlock, 'the-lock-key', async signal => {
  // ...
});
```

### `retry`

```ts
function retry<T>(
  signal: AbortSignal,
  fn: (signal: AbortSignal, attempt: number, reset: () => void) => Promise<T>,
  options?: RetryOptions,
): Promise<T>;

type RetryOptions = {
  baseMs?: number;
  maxDelayMs?: number;
  maxAttempts?: number;
  onError?: (error: unknown, attempt: number, delayMs: number) => void;
};
```

Retry a function with exponential backoff.

- `fn`

  A function that will be called and retried in case of error. It receives:

  - `signal`

    `AbortSignal` that is aborted when the signal passed to `retry` is aborted.

  - `attempt`

    Attempt number starting with 0.

  - `reset`

    Function that sets attempt number to -1 so that the next attempt will be
    made without delay.

- `RetryOptions.baseMs`

  Starting delay before first retry attempt in milliseconds.

  Defaults to 1000.

  Example: if `baseMs` is 100, then retries will be attempted in 100ms, 200ms,
  400ms etc (not counting jitter).

- `RetryOptions.maxDelayMs`

  Maximum delay between attempts in milliseconds.

  Defaults to 30 seconds.

  Example: if `baseMs` is 1000 and `maxDelayMs` is 3000, then retries will be
  attempted in 1000ms, 2000ms, 3000ms, 3000ms etc (not counting jitter).

- `RetryOptions.maxAttempts`

  Maximum for the total number of attempts.

  Defaults to `Infinity`.

- `RetryOptions.onError`

  Called after each failed attempt before setting delay timer.

  Rethrow error from this callback to prevent further retries.

### `proactiveRetry`

```ts
function proactiveRetry<T>(
  signal: AbortSignal,
  fn: (signal: AbortSignal, attempt: number) => Promise<T>,
  options?: ProactiveRetryOptions,
): Promise<T>;

type ProactiveRetryOptions = {
  baseMs?: number;
  maxAttempts?: number;
  onError?: (error: unknown, attempt: number) => void;
};
```

Proactively retry a function with exponential backoff.

Also known as hedging.

The function will be called multiple times in parallel until it succeeds, in
which case all the other calls will be aborted.

- `fn`

  A function that will be called multiple times in parallel until it succeeds.
  It receives:

  - `signal`

    `AbortSignal` that is aborted when the signal passed to `retry` is aborted,
    or when the function succeeds.

  - `attempt`

    Attempt number starting with 0.

- `ProactiveRetryOptions.baseMs`

  Base delay between attempts in milliseconds.

  Defaults to 1000.

  Example: if `baseMs` is 100, then retries will be attempted in 100ms, 200ms,
  400ms etc (not counting jitter).

- `ProactiveRetryOptions.maxAttempts`

  Maximum for the total number of attempts.

  Defaults to `Infinity`.

- `ProactiveRetryOptions.onError`

  Called after each failed attempt.

  Rethrow error from this callback to prevent further retries.

### `execute`

```ts
function execute<T>(
  signal: AbortSignal,
  executor: (
    resolve: (value: T) => void,
    reject: (reason?: any) => void,
  ) => () => void | PromiseLike<void>,
): Promise<T>;
```

Similar to `new Promise(executor)`, but allows executor to return abort callback
that is called once `signal` is aborted.

Returned promise rejects with `AbortError` once `signal` is aborted.

Callback can return a promise, e.g. for doing any async cleanup. In this case,
the promise returned from `execute` rejects with `AbortError` after that promise
fulfills.

### `abortable`

```ts
function abortable<T>(signal: AbortSignal, promise: PromiseLike<T>): Promise<T>;
```

Wrap a promise to reject with `AbortError` once `signal` is aborted.

Useful to wrap non-abortable promises. Note that underlying process will NOT be
aborted.

### `run`

```ts
function run(fn: (signal: AbortSignal) => Promise<void>): () => Promise<void>;
```

Invokes an abortable function with implicitly created `AbortSignal`.

Returns a function that aborts that signal and waits until passed function
finishes.

Any error other than `AbortError` thrown from passed function will result in
unhandled promise rejection.

Example:

```ts
const stop = run(async signal => {
  try {
    while (true) {
      await delay(signal, 1000);
      console.log('tick');
    }
  } finally {
    await doCleanup();
  }
});

// abort and wait until cleanup is done
await stop();
```

This function is also useful with React `useEffect` hook:

```ts
// make requests periodically while the component is mounted
useEffect(
  () =>
    run(async signal => {
      while (true) {
        await makeRequest(signal);
        await delay(signal, 1000);
      }
    }),
  [],
);
```

### `AbortError`

```ts
class AbortError extends Error
```

Thrown when an abortable function was aborted.

**Warning**: do not use `instanceof` with this class. Instead, use
`isAbortError` function.

### `isAbortError`

```ts
function isAbortError(error: unknown): boolean;
```

Checks whether given `error` is an `AbortError`.

### `throwIfAborted`

```ts
function throwIfAborted(signal: AbortSignal): void;
```

If `signal` is aborted, throws `AbortError`. Otherwise does nothing.

### `rethrowAbortError`

```ts
function rethrowAbortError(error: unknown): void;
```

If `error` is `AbortError`, throws it. Otherwise does nothing.

Useful for `try/catch` blocks around abortable code:

```ts
try {
  await somethingAbortable(signal);
} catch (err) {
  rethrowAbortError(err);

  // do normal error handling
}
```

### `catchAbortError`

```ts
function catchAbortError(error: unknown): void;
```

If `error` is `AbortError`, does nothing. Otherwise throws it.

Useful for invoking top-level abortable functions:

```ts
somethingAbortable(signal).catch(catchAbortError);
```

Without `catchAbortError`, aborting would result in unhandled promise rejection.

[npm-image]: https://badge.fury.io/js/abort-controller-x.svg
[npm-url]: https://badge.fury.io/js/abort-controller-x
