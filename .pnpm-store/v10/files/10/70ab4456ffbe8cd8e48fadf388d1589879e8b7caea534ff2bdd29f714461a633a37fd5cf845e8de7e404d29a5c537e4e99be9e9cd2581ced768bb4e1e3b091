# @fastify/otel

[![CI](https://github.com/fastify/otel/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/fastify/otel/actions/workflows/ci.yml)
[![NPM version](https://img.shields.io/npm/v/@fastify/otel.svg?style=flat)](https://www.npmjs.com/package/@fastify/otel)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-brightgreen?style=flat)](https://github.com/neostandard/neostandard)

OpenTelemetry auto-instrumentation library.

## Install

```sh
npm i @fastify/otel
```

## Usage

`@fastify/otel` works as a metric creator as well as application performance monitor for your Fastify application.

It must be configured before defining routes and other plugins in order to cover the most of your Fastify server.

- It automatically wraps the main request handler
- Instruments all route hooks (defined at instance and route definition level)
  - `onRequest`
  - `preParsing`
  - `preValidation`
  - `preHandler`
  - `preSerialization`
  - `onSend`
  - `onResponse`
  - `onError`
- Instruments automatically custom 404 Not Found handler

Example:

```js
// ... in your OTEL setup
const FastifyOtelInstrumentation = require('@fastify/otel');

// Service name comes from OpenTelemetry resources (via NodeSDK or OTEL_SERVICE_NAME)
// as per https://opentelemetry.io/docs/languages/sdk-configuration/general/.
const fastifyOtelInstrumentation = new FastifyOtelInstrumentation();
fastifyOtelInstrumentation.setTracerProvider(provider)

module.exports = { fastifyOtelInstrumentation }

// ... in your Fastify definition
const { fastifyOtelInstrumentation } = require('./otel.js');
const Fastify = require('fastify');

const app = fastify();
// It is necessary to await for its register as it requires to be able
// to intercept all route definitions
await app.register(fastifyOtelInstrumentation.plugin());

// automatically all your routes will be instrumented
app.get('/', () => 'hello world')
// as well as your instance level hooks.
app.addHook('onError', () => /* do something */)
// Manually skip telemetry for a specific route
app.get('/healthcheck', { config: { otel: false } }, () => 'Up!')

// you can also scope your instrumentation to only be enabled on a sub context
// of your application
app.register((instance, opts, done) => {
    instance.register(fastifyOtelInstrumentation.plugin());
    // If only enabled in your encapsulated context
    // the parent context won't be instrumented
    app.get('/', () => 'hello world')

    done()
}, { prefix: '/nested' })
```

### Registration using OpenTelemetry Node SDK

The plugin can be automatically registered using Node SDK, with `registerOnInitialization` option set to `true`.

```js
// ... in your OTEL setup
import { NodeSDK } from '@opentelemetry/sdk-node';
import FastifyOtelInstrumentation from "@fastify/otel";

const sdk = new NodeSDK({
  resource: ...,
  traceExporter: ...,
  instrumentations: [
    ...others,
    new FastifyOtelInstrumentation({ registerOnInitialization: true })
  ],
});

sdk.start();

```

> **Notes**:
>
> - This instrumentation requires `@opentelemetry/instrumentation-http` to be able to propagate the traces all the way back to upstream
>   - The HTTP instrumentation might cover all your routes although `@fastify/otel` just covers a subset of your application

For more information about OpenTelemetry, please refer to the [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/) documentation.

## APIs

### `FastifyOtelRequestContext`

The `FastifyOtelRequestContext` is a wrapper around the OpenTelemetry `Context` and `Tracer` APIs. It also provides a way to manage the context of a request and its associated spans as well as some utilities to extract and inject further traces from and to the trace carrier.

#### `FastifyOtelRequestContext#context: Context`
The OpenTelemetry context object.

#### `FastifyOtelRequestContext#tracer: Tracer`
The OpenTelemetry tracer object.

#### `FastifyOtelRequestContext#span: Span`
The OpenTelemetry span object.
The span is created for each request and is automatically ended when the request is completed.

#### `FastifyOtelRequestContext#inject: function`
The OpenTelemetry inject function. It is used to inject the current context into a carrier object.

The carrier object can be any object that can hold key-value pairs, such as an HTTP request or response headers.

#### `FastifyOtelRequestContext#extract: function`
The OpenTelemetry extract function. It is used to extract a parent context from a carrier object.

The carrier object can be any object that can hold key-value pairs, such as an HTTP request or response headers.

The extracted context can be used as a parent span for a new span.

```js
const { fastifyOtelInstrumentation } = require('./otel.js');
const Fastify = require('fastify');

const app = fastify();
await app.register(fastifyOtelInstrumentation.plugin());

app.get('/', (req, reply) => {
  const { context, tracer, span, inject, extract } = req.opentelemetry();

  // Extract a parent span from the request headers
  const parentCxt = extract(req.headers);

  // Create a new span
  const newSpan = tracer.startSpan('my-new-span', {
    parent: parentCxt,
  });
  // Do some work
  newSpan.end();

  // Inject the new span into the response headers
  const carrier = {};
  inject(carrier);

  reply.headers(carrier);

  return 'hello world';
});
```

## Interfaces

### `FastifyOtelInstrumentationOptions`

The options for the `FastifyOtelInstrumentation` class.



#### `FastifyOtelInstrumentationOptions#registerOnInitialization: boolean`

Whether to register the plugin on initialization. If set to `true`, the plugin will be registered automatically when the Fastify instance is created.

This is useful for applications that want to ensure that all routes are instrumented without having to manually register the plugin.

#### `FastifyOtelInstrumentationOptions#ignorePaths: string | function`

String or function to ignore paths from being instrumented.

If a string is provided, it will be used as a glob match pattern.

If a function is provided, it will be called with the request options and should return true if the path should be ignored.

#### `FastifyOtelInstrumentationOptions#requestHook: function`
A **synchronous** callback that runs immediately after the root request span is created.
* **span** – the newly-created `Span`
* **info.request** – the current `FastifyRequest`

Use it to add custom attributes, events, or rename the span.
If the function throws, the error is caught and logged so the request flow is never interrupted.


#### Examples

```ts
import { FastifyOtelInstrumentation } from '@fastify/otel';

const fastifyOtelInstrumentation = new FastifyOtelInstrumentation({
  registerOnInitialization: true,
  ignorePaths: (opts) => {
    // Ignore all paths that start with /ignore
    return opts.url.startsWith('/ignore');
  },
});

// Service name should be set via environment variable:
// export OTEL_SERVICE_NAME=my-server
// or via NodeSDK resource configuration
```

```js
const otel = new FastifyOtelInstrumentation({
  requestHook: (span, request) => {
    // attach user info
    span.setAttribute('user.id', request.headers['x-user-id'] ?? 'anonymous')

    // optional: give the span a cleaner name
    span.updateName(`${request.method} ${request.routeOptions.url}`)
  }
})
```

#### `FastifyOtelInstrumentationOptions#lifecycleHook: function`

A **synchronous** callback that runs whenever a span is created for a Fastify lifecycle hook (route hooks, instance hooks, not-found handlers, and route handlers).
* **span** – the hook span that was just created
* **info.hookName** – Fastify lifecycle stage (e.g., `onRequest`, `preHandler`, `handler`)
* **info.handler** – the resolved handler or plugin name when available
* **info.request** – the current `FastifyRequest`

Use it to rename hook spans or annotate them with framework-specific metadata (for example, tRPC procedure names) without registering additional Fastify hooks.

```js
const otel = new FastifyOtelInstrumentation({
  lifecycleHook: (span, info) => {
    if (info.hookName === 'handler' && info.request.headers['x-trpc-op'] != null) {
      span.updateName(`tRPC handler - ${info.request.headers['x-trpc-op']}`)
    }

    span.setAttribute('hook.handler.name', info.handler ?? 'anonymous')
  }
})
```

#### `FastifyOtelInstrumentationOptions#recordExceptions: boolean`

Control whether the instrumentation automatically calls `span.recordException` when a handler or hook throws.
Defaults to `true`, recording every exception. Set it to `false` if you prefer to record only the
exceptions that you consider actionable (for example to avoid noisy `4xx` entries in Datadog Error Tracking).

## License

Licensed under [MIT](./LICENSE).
