# OpenTelemetry Express Instrumentation for Node.js

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This module provides automatic instrumentation for the [`express`](https://github.com/expressjs/express) module, which may be loaded using the [`@opentelemetry/sdk-trace-node`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-node) package and is included in the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle.

If total installation size is not constrained, it is recommended to use the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle with [@opentelemetry/sdk-node](`https://www.npmjs.com/package/@opentelemetry/sdk-node`) for the most seamless instrumentation experience.

Compatible with OpenTelemetry JS API and SDK `1.0+`.

## Installation

This instrumentation relies on HTTP calls to also be instrumented. Make sure you install and enable both, otherwise you will not see any spans being exported from the instrumentation.

```bash
npm install --save @opentelemetry/instrumentation-http @opentelemetry/instrumentation-express
```

### Supported Versions

- [`express`](https://www.npmjs.com/package/express) version `>=4.0.0 <6`

## Usage

OpenTelemetry Express Instrumentation allows the user to automatically collect trace data and export them to their backend of choice, to give observability to distributed systems.

To load the instrumentation, specify it in the Node Tracer's configuration:

```js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');

const provider = new NodeTracerProvider();
provider.register();

registerInstrumentations({
  instrumentations: [
    // Express instrumentation expects HTTP layer to be instrumented
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
  ],
});
```

See [examples/express](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/examples/express) for a short example.

### Caveats

Because of the way express works, it's hard to correctly compute the time taken by asynchronous middlewares and request handlers. For this reason, the time you'll see reported for asynchronous middlewares and request handlers still only represent the synchronous execution time, and **not** any asynchronous work.

### Express Instrumentation Options

Express instrumentation has few options available to choose from. You can set the following:

| Options            | Type                                               | Example                | Description                                                                                            |
|--------------------|----------------------------------------------------|------------------------|--------------------------------------------------------------------------------------------------------|
| `ignoreLayers`     | `IgnoreMatcher[]`                                  | `[/^\/_internal\//]`   | Ignore layers that by match.                                                                           |
| `ignoreLayersType` | `ExpressLayerType[]`                               | `['request_handler']`  | Ignore layers of specified type.                                                                       |
| `spanNameHook`     | `SpanNameHook`                                     | `() => 'my-span-name'` | Can be used to customize span names by returning a new name from the hook.                             |
| `requestHook`      | `ExpressRequestCustomAttributeFunction (function)` | `(span, info) => {}`   | Function for adding custom attributes on Express request. Receives params: `Span, ExpressRequestInfo`. |

`ignoreLayers` accepts an array of elements of types:

- `string` for full match of the path,
- `RegExp` for partial match of the path,
- `function` in the form of `(path) => boolean` for custom logic.

`ignoreLayersType` accepts an array of following strings:

- `router` is the name of `express.Router()`,
- `middleware`,
- `request_handler` is the name for anything that's not a router or a middleware.

`spanNameHook` is invoked with 2 arguments:

- `info: ExpressRequestInfo` containing the incoming Express.js request, the current route handler creating a span and `ExpressLayerType` - the type of the handling layer.
- `defaultName: string` - original name proposed by the instrumentation.

`requestHook` is invoked with 2 arguments:

- `span: Span` - the span associated with the express request.
- `info: ExpressRequestInfo` containing the incoming Express.js request, the current route handler creating a span and `ExpressLayerType` - the type of the handling layer.

NOTE: `ExpressRequestInfo.request` is typed as `any`. If you want type support make sure you have `@types/express` installed then you can use `ExpressRequestInfo<express.Request>`

#### Ignore a whole Express route

In order to ignore whole traces that represent a given Express route, use
the `ignoreIncomingRequestHook` option from
`@opentelemetry/instrumentation-http` against the route path. Ideally, this
shouldn't be necessary since spans should a have low cardinality and minimize
interaction between instrumentation libraries but
`@opentelemetry/instrumentation-express` renames the root span from
`@opentelemetry/instrumentation-http` in order to get things in order.

```js
registerInstrumentations({
  instrumentations: [
    // Express instrumentation expects HTTP layer to be instrumented
    new HttpInstrumentation({
      ignoreIncomingRequestHook(req) {
        // Ignore spans from static assets.
        const isStaticAsset = !!req.url.match(/^\/static\/.*$/);
        return isStaticAsset;
      }
    }),
    new ExpressInstrumentation(),
  ],
});
```

#### Using `requestHook`

Instrumentation configuration accepts a custom "hook" function which will be called for every instrumented Express layer involved in a request. Custom attributes can be set on the span or run any custom logic per layer.

Here is a simple example that adds to the request handler span some attributes based on the Express request attributes:

```javascript
import { ExpressInstrumentation, ExpressLayerType } from "@opentelemetry/instrumentation-express"

const expressInstrumentation = new ExpressInstrumentation({
  requestHook: function (
    span: Span,
    info: ExpressRequestInfo,
  ) {

    if (info.layerType === ExpressLayerType.REQUEST_HANDLER) {
      span.setAttribute(
        'http.method',
        info.request.method
      );

      span.setAttribute(
        'express.base_url',
        info.request.baseUrl
      );
    }
  }
});
```

## Semantic Conventions

This package uses `@opentelemetry/semantic-conventions` version `1.22+`, which implements Semantic Convention [Version 1.7.0](https://github.com/open-telemetry/opentelemetry-specification/blob/v1.7.0/semantic_conventions/README.md)

Attributes collected:

| Attribute    | Short Description                  |
| ------------ | ---------------------------------- |
| `http.route` | The matched route (path template). |

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-express
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-express.svg
