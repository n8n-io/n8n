<p align="center">
  <a href="https://sentry.io/?utm_source=github&utm_medium=logo" target="_blank">
    <img src="https://sentry-brand.storage.googleapis.com/sentry-wordmark-dark-280x84.png" alt="Sentry" width="280" height="84">
  </a>
</p>

# Official Sentry SDK for Node-Core

[![npm version](https://img.shields.io/npm/v/@sentry/node-core.svg)](https://www.npmjs.com/package/@sentry/node-core)
[![npm dm](https://img.shields.io/npm/dm/@sentry/node-core.svg)](https://www.npmjs.com/package/@sentry/node-core)
[![npm dt](https://img.shields.io/npm/dt/@sentry/node-core.svg)](https://www.npmjs.com/package/@sentry/node-core)

Unlike the `@sentry/node` SDK, this SDK comes with no OpenTelemetry auto-instrumentation out of the box. It requires the following OpenTelemetry dependencies and supports both v1 and v2 of OpenTelemetry:

- `@opentelemetry/api`
- `@opentelemetry/context-async-hooks`
- `@opentelemetry/core`
- `@opentelemetry/instrumentation`
- `@opentelemetry/resources`
- `@opentelemetry/sdk-trace-base`
- `@opentelemetry/semantic-conventions`.

## Installation

```bash
npm install @sentry/node-core @sentry/opentelemetry @opentelemetry/api @opentelemetry/core @opentelemetry/context-async-hooks @opentelemetry/instrumentation @opentelemetry/resources @opentelemetry/sdk-trace-base @opentelemetry/semantic-conventions

# Or yarn
yarn add @sentry/node-core @sentry/opentelemetry @opentelemetry/api @opentelemetry/core @opentelemetry/context-async-hooks @opentelemetry/instrumentation @opentelemetry/resources @opentelemetry/sdk-trace-base @opentelemetry/semantic-conventions
```

## Usage

Sentry should be initialized as early in your app as possible. It is essential that you call `Sentry.init` before you
require any other modules in your application, otherwise any auto-instrumentation will **not** work.

You also **have to** set up OpenTelemetry, if you prefer not to, consider using the `@sentry/node` SDK instead.
Without setting up OpenTelemetry, you only get basic error tracking out of the box without proper scope isolation.

You need to create a file named `instrument.js` that imports and initializes Sentry:

```js
// CJS Syntax
const { trace, propagation, context } = require('@opentelemetry/api');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const Sentry = require('@sentry/node-core');
const { SentrySpanProcessor, SentryPropagator, SentrySampler } = require('@sentry/opentelemetry');
// ESM Syntax
import { context, propagation, trace } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import * as Sentry from '@sentry/node-core';
import { SentrySpanProcessor, SentryPropagator, SentrySampler } from '@sentry/opentelemetry';

const sentryClient = Sentry.init({
  dsn: '__DSN__',
  // ...
});

if (sentryClient) {
  // Note: This could be BasicTracerProvider or any other provider depending on how you want to use the
  // OpenTelemetry SDK
  const provider = new NodeTracerProvider({
    // Ensure the correct subset of traces is sent to Sentry
    // This also ensures trace propagation works as expected
    sampler: new SentrySampler(sentryClient),
    spanProcessors: [
      // Ensure spans are correctly linked & sent to Sentry
      new SentrySpanProcessor(),
      // Add additional processors here
    ],
  });

  trace.setGlobalTracerProvider(provider);
  propagation.setGlobalPropagator(new SentryPropagator());
  context.setGlobalContextManager(new Sentry.SentryContextManager());
}

// Set up the OpenTelemetry logger to use Sentry's logger
Sentry.setupOpenTelemetryLogger();

// validate your setup
Sentry.validateOpenTelemetrySetup();
```

You need to require or import the `instrument.js` file before importing any other modules in your application. This is
necessary to ensure that Sentry can automatically instrument all modules in your application:

```js
// Import this first!
import './instrument';

// Now import other modules
import http from 'http';

// Your application code goes here
```

### ESM Support

When running your application in ESM mode, you should use the Node.js
[`--import`](https://nodejs.org/api/cli.html#--importmodule) command line option to ensure that Sentry is loaded before
the application code is evaluated.

Adjust the Node.js call for your application to use the `--import` parameter and point it at `instrument.js`, which
contains your `Sentry.init`() code:

```bash
# Note: This is only available for Node v18.19.0 onwards.
node --import ./instrument.mjs app.mjs
```

If it is not possible for you to pass the `--import` flag to the Node.js binary, you can alternatively use the
`NODE_OPTIONS` environment variable as follows:

```bash
NODE_OPTIONS="--import ./instrument.mjs" npm run start
```

## Links

- [Official SDK Docs](https://docs.sentry.io/quickstart/)
