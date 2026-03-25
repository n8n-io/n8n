# OpenTelemetry Koa Instrumentation for Node.js

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This module provides automatic instrumentation for the [Koa](https://github.com/koajs/koa) module, which may be loaded using the [`@opentelemetry/sdk-trace-node`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-node) package and is included in the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle.

If total installation size is not constrained, it is recommended to use the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle with [@opentelemetry/sdk-node](`https://www.npmjs.com/package/@opentelemetry/sdk-node`) for the most seamless instrumentation experience.

Compatible with OpenTelemetry JS API and SDK `1.0+`.

## Status

| Maturity                                           | [Component Owner](../../.github/component_owners.yml) | Compatibility         |
|----------------------------------------------------|-------------------------------------------------------|-----------------------|
| [Unmaintained](../../CONTRIBUTING.md#unmaintained) | N/A                                                   | API 1.0+<br/>SDK 1.0+ |

## Installation

```bash
npm install --save @opentelemetry/instrumentation-koa
```

### Supported Versions

- [`koa`](https://www.npmjs.com/package/koa) versions `>=2.0.0 <4`
- [`@koa/router`](https://www.npmjs.com/package/@koa/router) versions `>=8.0.0`

## Usage

OpenTelemetry Koa Instrumentation allows the user to automatically collect trace data and export them to their backend of choice, to give observability to distributed systems.

```js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { KoaInstrumentation } = require('@opentelemetry/instrumentation-koa');

const provider = new NodeTracerProvider();
provider.register();

registerInstrumentations({
  instrumentations: [
    new KoaInstrumentation(),
  ],
});
```

See [`examples/koa`](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/examples/koa) for a short example using both Koa and @koa/router.

Note that generator-based middleware are deprecated and won't be instrumented.

### Koa Instrumentation Options

| Options            | Type                                | Example              | Description                                                                                              |
| ------------------ | ----------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------- |
| `ignoreLayersType` | `KoaLayerType[]`                    | `['middleware']`     | Ignore layers of specified type.                                                                         |
| `requestHook`      | `KoaRequestCustomAttributeFunction` | `(span, info) => {}` | Function for adding custom attributes to Koa middleware layers. Receives params: `Span, KoaRequestInfo`. |

`ignoreLayersType` accepts an array of `KoaLayerType` which can take the following string values:

- `router`,
- `middleware`.

#### Using `requestHook`

Instrumentation configuration accepts a custom "hook" function which will be called for every instrumented Koa middleware layer involved in a request. Custom attributes can be set on the span or run any custom logic per layer.

NOTE: `KoaRequestInfo.context` and `KoaRequestInfo.middlewareLayer` are typed as `any`. If you want type support make sure you have `@types/koa` and `@types/koa__router` installed then you can use the following type definitions:

```typescript
import { KoaInstrumentation } from "@opentelemetry/instrumentation-koa"
import type { Middleware, ParameterizedContext, DefaultState } from 'koa';
import type { RouterParamContext } from '@koa/router';

type KoaContext = ParameterizedContext<DefaultState, RouterParamContext>;
type KoaMiddleware = Middleware<DefaultState, KoaContext>;

const koaInstrumentation = new KoaInstrumentation({
  requestHook: function (span: Span, info: KoaRequestInfo<KoaContext, KoaMiddleware>) {
    span.setAttribute(
      'http.method',
      info.context.request.method
    )
  }
});
```

## Koa Packages

This package provides automatic tracing for middleware added using either the core [`koa`](https://github.com/koajs/koa) package or the [`@koa/router`](https://github.com/koajs/router) package.

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-koa
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-koa.svg
