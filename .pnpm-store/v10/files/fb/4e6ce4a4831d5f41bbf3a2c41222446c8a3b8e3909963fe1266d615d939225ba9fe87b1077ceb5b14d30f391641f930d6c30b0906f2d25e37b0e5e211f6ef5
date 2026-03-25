# `@sentry-internal/node-native-stacktrace`

A native Node.js module that can capture JavaScript stack traces for registered
main or worker threads from any other thread, even if event loops are blocked.

The module also provides a means to create a watchdog system to track event loop
blocking via periodic heartbeats. When the time from the last heartbeat crosses
a threshold, JavaScript stack traces can be captured.

For Node.js >= v24, this module can also capture state from `AsyncLocalStorage`
at the time of stack trace capture, which can help provide context on what the
thread was working on when it became blocked.

This native module is used for Sentry's
[Event Loop Blocked Detection](https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/event-loop-block/)
feature.

## Basic Usage

### 1. Register threads you want to monitor

In your main thread or worker threads:

```ts
import { registerThread } from "@sentry-internal/node-native-stacktrace";

// Register this thread for monitoring
registerThread();
```

### 2. Capture stack traces from any thread

```ts
import { captureStackTrace } from "@sentry-internal/node-native-stacktrace";

// Capture stack traces from all registered threads
const stacks = captureStackTrace();
console.log(stacks);
```

### Example Output

Stack traces show where each thread is currently executing:

```js
{
  '0': { // Main thread has ID '0'
    frames: [
      {
        function: 'from',
        filename: 'node:buffer',
        lineno: 298,
        colno: 28
      },
      {
        function: 'pbkdf2Sync',
        filename: 'node:internal/crypto/pbkdf2',
        lineno: 78,
        colno: 17
      },
      {
        function: 'longWork',
        filename: '/app/test.js',
        lineno: 20,
        colno: 29
      },
      {
        function: '?',
        filename: '/app/test.js',
        lineno: 24,
        colno: 1
      }
    ]
  },
  '2': { // Worker thread
    frames: [
      {
        function: 'from',
        filename: 'node:buffer',
        lineno: 298,
        colno: 28
      },
      {
        function: 'pbkdf2Sync',
        filename: 'node:internal/crypto/pbkdf2',
        lineno: 78,
        colno: 17
      },
      {
        function: 'longWork',
        filename: '/app/worker.js',
        lineno: 10,
        colno: 29
      },
      {
        function: '?',
        filename: '/app/worker.js',
        lineno: 14,
        colno: 1
      }
    ]
  }
}
```

## Advanced Usage: Automatic blocked event loop Detection

Set up automatic detection of blocked event loops:

### 1. Register threads with `AsyncLocalStorage` state tracking and heartbeats

Send regular heartbeats:

```ts
import {
  registerThread,
  threadPoll,
} from "@sentry-internal/node-native-stacktrace";
import { AsyncLocalStorage } from "node:async_hooks";

// Create async local storage for state tracking
const asyncLocalStorage = new AsyncLocalStorage();
// Set some state in the async local storage
asyncLocalStorage.enterWith({ someState: "value" });

// Register this thread with async local storage
registerThread({ asyncLocalStorage });

// Send heartbeats every 200ms
setInterval(() => {
  threadPoll();
}, 200);
```

### 2. Monitor from a watchdog thread

Monitor all registered threads from a dedicated thread:

```ts
import {
  captureStackTrace,
  getThreadsLastSeen,
} from "@sentry-internal/node-native-stacktrace";

const THRESHOLD = 1000; // 1 second

setInterval(() => {
  const threadsLastSeen = getThreadsLastSeen();

  for (const [threadId, timeSinceLastSeen] of Object.entries(threadsLastSeen)) {
    if (timeSinceLastSeen > THRESHOLD) {
      // Thread appears to be blocked - capture diagnostics
      const stackTraces = captureStackTrace();
      const blockedThread = stackTraces[threadId];

      console.error(`🚨 Thread ${threadId} blocked for ${timeSinceLastSeen}ms`);
      console.error("Stack trace:", blockedThread.frames);
      console.error("Async state:", blockedThread.asyncState);
    }
  }
}, 500); // Check every 500ms
```

## API Reference

### Functions

#### `registerThread(threadName?: string): void`

#### `registerThread(asyncStorage: AsyncStorageArgs, threadName?: string): void`

Registers the current thread for stack trace capture. Must be called from each
thread you want to capture stack traces from.

- `threadName` (optional): Name for the thread. Defaults to the current thread
  ID.
- `asyncStorage` (optional): `AsyncStorageArgs` to fetch state from
  `AsyncLocalStorage` on stack trace capture.

```ts
type AsyncStorageArgs = {
  /** AsyncLocalStorage instance to fetch state from */
  asyncLocalStorage: AsyncLocalStorage<unknown>;
  /**
   * Optional array of keys to pick a specific property from the store.
   * Key will be traversed in order through Objects/Maps to reach the desired property.
   *
   * This is useful if you want to capture Open Telemetry context values as state.
   *
   * To get this value:
   * context.getValue(MY_UNIQUE_SYMBOL_REF)
   *
   * You would set:
   * stateLookup: ['_currentContext', MY_UNIQUE_SYMBOL_REF]
   */
  stateLookup?: Array<string | symbol>;
};
```

#### `captureStackTrace<State>(): Record<string, Thread<A, P>>`

Captures stack traces from all registered threads. Can be called from any thread
but will not capture a stack trace for the calling thread itself.

```ts
type Thread<A = unknown, P = unknown> = {
  frames: StackFrame[];
  /** State captured from the AsyncLocalStorage */
  asyncState?: A;
  /** Optional state provided when calling threadPoll */
  pollState?: P;
};

type StackFrame = {
  function: string;
  filename: string;
  lineno: number;
  colno: number;
};
```

#### `threadPoll<State>(disableLastSeen?: boolean, pollState?: object): void`

Sends a heartbeat from the current thread.

- `disableLastSeen` (optional): If `true`, disables the tracking of the last
  seen time for this thread.
- `pollState` (optional): An object containing state to include with the next
  stack trace capture. This can be used instead of or in addition to
  `AsyncLocalStorage` based state tracking.

#### `getThreadsLastSeen(): Record<string, number>`

Returns the time in milliseconds since each registered thread called
`threadPoll()`.
