# OpenTelemetry Node SDK

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This module provides *automated instrumentation and tracing* for Node.js applications.

For manual instrumentation see the
[@opentelemetry/sdk-trace-base](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-base) package.

**Note: Much of OpenTelemetry JS documentation is written assuming the compiled application is run as CommonJS.**
For more details on ECMAScript Modules vs CommonJS, refer to [esm-support](https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/esm-support.md).

## How auto instrumentation works

This package exposes a `NodeTracerProvider`.
For loading instrumentations please use `registerInstrumentations` function from [opentelemetry-instrumentation](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-instrumentation)

OpenTelemetry comes with a growing number of instrumentation plugins for well known modules (see [supported modules](https://github.com/open-telemetry/opentelemetry-js#instrumentations)) and an API to create custom instrumentation (see [the instrumentation developer guide](https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/instrumentation-guide.md)).

> **Please note:** This module does *not* bundle any plugins. They need to be installed separately.

This is done by wrapping all tracing-relevant functions.

This instrumentation code will automatically

- extract a trace-context identifier from inbound requests to allow distributed tracing (if applicable)
- make sure that this current trace-context is propagated while the transaction traverses an application (see [context document in @opentelemetry/api][def-context] for an in-depth explanation)
- add this trace-context identifier to outbound requests to allow continuing the distributed trace on the next hop (if applicable)
- create and end spans

## Creating custom spans on top of auto-instrumentation

Additionally to automated instrumentation, `NodeTracerProvider` exposes the same API as [@opentelemetry/sdk-trace-base](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-base), allowing creating custom spans if needed.

## Installation

```bash
npm install --save @opentelemetry/api
npm install --save @opentelemetry/sdk-trace-node

# Install instrumentation plugins
npm install --save @opentelemetry/instrumentation-http
# and for example one additional
npm install --save @opentelemetry/instrumentation-graphql
```

## Usage

The following code will configure the `NodeTracerProvider` to instrument `http`
(and any other installed [supported
modules](https://github.com/open-telemetry/opentelemetry-js#plugins))
using `@opentelemetry/plugin-http`.

```javascript
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');

// Create and configure NodeTracerProvider
const provider = new NodeTracerProvider();

// Initialize the provider
provider.register();

// register and load instrumentation and old plugins - old plugins will be loaded automatically as previously
// but instrumentations needs to be added
registerInstrumentations({
});

// Your application code - http will automatically be instrumented if
// @opentelemetry/plugin-http is present
const http = require('http');
```

## Instrumentation configuration

In the following example:

- the express instrumentation is enabled
- the http instrumentation has a custom config for a `requestHook`

```javascript
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');

const provider = new NodeTracerProvider();
provider.register();

// register and load instrumentation and old plugins - old plugins will be loaded automatically as previously
// but instrumentations needs to be added
registerInstrumentations({
  instrumentations: [
    new ExpressInstrumentation(),
    new HttpInstrumentation({
        requestHook: (span, request) => {
          span.setAttribute("custom request hook attribute", "request");
        },
    }),
  ],
});


```

## Examples

See how to automatically instrument [http](https://github.com/open-telemetry/opentelemetry-js/tree/main/examples/http) and [gRPC](https://github.com/open-telemetry/opentelemetry-js/tree/main/examples/grpc) / [grpc-js](https://github.com/open-telemetry/opentelemetry-js/tree/main/examples/grpc-js) using node-sdk.

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[def-context]: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/context.md
[npm-url]: https://www.npmjs.com/package/@opentelemetry/sdk-trace-node
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Fsdk-trace-node.svg
