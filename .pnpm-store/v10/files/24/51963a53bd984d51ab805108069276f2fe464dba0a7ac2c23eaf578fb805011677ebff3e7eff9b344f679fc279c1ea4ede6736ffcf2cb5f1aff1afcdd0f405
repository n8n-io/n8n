<p align="center">
  <a href="https://sentry.io/?utm_source=github&utm_medium=logo" target="_blank">
    <img src="https://sentry-brand.storage.googleapis.com/sentry-wordmark-dark-280x84.png" alt="Sentry" width="280" height="84">
  </a>
</p>

# Native Tools for the Official Sentry Node.js SDK

[![npm version](https://img.shields.io/npm/v/@sentry/node-native.svg)](https://www.npmjs.com/package/@sentry/node-native)
[![npm dm](https://img.shields.io/npm/dm/@sentry/node-native.svg)](https://www.npmjs.com/package/@sentry/node-native)
[![npm dt](https://img.shields.io/npm/dt/@sentry/node-native.svg)](https://www.npmjs.com/package/@sentry/node-native)

## Installation

```bash
# Using yarn
yarn add @sentry/node @sentry/node-native

# Using npm
npm install --save @sentry/node @sentry/node-native
```

## `eventLoopBlockIntegration`

The `eventLoopBlockIntegration` can be used to monitor for blocked event loops in
all threads of a Node.js application.

If you instrument your application via the Node.js `--import` flag, Sentry will
be started and this instrumentation will be automatically applied to all worker
threads.

`instrument.mjs`

```javascript
import * as Sentry from '@sentry/node';
import { eventLoopBlockIntegration } from '@sentry/node-native';

Sentry.init({
  dsn: '__YOUR_DSN__',
  // Capture stack traces when the event loop is blocked for more than 500ms
  integrations: [eventLoopBlockIntegration({ threshold: 500 })],
});
```

`app.mjs`

```javascript
import { Worker } from 'worker_threads';

const worker = new Worker(new URL('./worker.mjs', import.meta.url));

// This main thread will be monitored for blocked event loops
```

`worker.mjs`

```javascript
// This worker thread will also be monitored for blocked event loops too
```

Start your application:

```bash
node --import instrument.mjs app.mjs
```

If a thread is blocked for more than the configured threshold, stack traces will
be captured for all threads and sent to Sentry.
