# OpenTelemetry Hapi Instrumentation for Node.js

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This module provides automatic instrumentation for the [Hapi Framework](https://hapi.dev)(`@hapi/hapi`)package, which may be loaded using the [`@opentelemetry/sdk-trace-node`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-node) package and is included in the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle.

If total installation size is not constrained, it is recommended to use the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle with [@opentelemetry/sdk-node](`https://www.npmjs.com/package/@opentelemetry/sdk-node`) for the most seamless instrumentation experience.

Compatible with OpenTelemetry JS API and SDK `1.0+`.

## Status

| Maturity                                           | [Component Owner](../../.github/component_owners.yml) | Compatibility         |
|----------------------------------------------------|-------------------------------------------------------|-----------------------|
| [Unmaintained](../../CONTRIBUTING.md#unmaintained) | N/A                                                   | API 1.0+<br/>SDK 1.0+ |

## Installation

```bash
npm install --save @opentelemetry/instrumentation-hapi
```

### Supported Versions

- [`@hapi/hapi`](https://www.npmjs.com/package/@hapi/hapi) versions `>=17.0.0 <22`

## Usage

OpenTelemetry Hapi Instrumentation allows the user to automatically collect trace data and export them to their backend of choice, to give observability to distributed systems.

To load a specific instrumentation (Hapi in this case), specify it in the registerInstrumentations' configuration.

```js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HapiInstrumentation } = require('@opentelemetry/instrumentation-hapi');

const provider = new NodeTracerProvider();
provider.register();

registerInstrumentations({
  instrumentations: [
    new HapiInstrumentation(),
  ],
});
```

If instead you would just want to load a specific instrumentation only (**hapi** in this case);

```js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { HapiInstrumentation } = require('@opentelemetry/instrumentation-hapi');
const provider = new NodeTracerProvider();
provider.register();

const hapiInstrumentation = new HapiInstrumentation();
hapiInstrumentation.setTracerProvider(provider);
```

See [examples/hapi](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/examples/hapi) for a short example using Hapi

<!--
The dev dependency of `@hapi/podium@4.1.1` is required to force the compatible type declarations. See: https://github.com/hapijs/hapi/issues/4240
-->

## Hapi Instrumentation Support

This package provides automatic tracing for hapi server routes and [request lifecycle](https://github.com/hapijs/hapi/blob/master/API.md#request-lifecycle) extensions defined either directly or via a Hapi plugin.

## Semantic Conventions

Prior to version `0.48.0`, this instrumentation created spans targeting an experimental semantic convention [Version 1.7.0](https://github.com/open-telemetry/opentelemetry-specification/blob/v1.7.0/semantic_conventions/README.md).

HTTP semantic conventions (semconv) were stabilized in v1.23.0, and a [migration process](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/non-normative/http-migration.md#http-semantic-convention-stability-migration) was defined. `instrumentation-hapi` versions 0.48.0 and later include support for migrating to stable HTTP semantic conventions, as described below. The intent is to provide an approximate 6 month time window for users of this instrumentation to migrate to the new HTTP semconv, after which a new minor version will use the *new* semconv by default and drop support for the old semconv. See the [HTTP semconv migration plan for OpenTelemetry JS instrumentations](https://github.com/open-telemetry/opentelemetry-js/issues/5646).

To select which semconv version(s) is emitted from this instrumentation, use the `OTEL_SEMCONV_STABILITY_OPT_IN` environment variable.

- `http`: emit the new (stable) v1.23.0+ semantics
- `http/dup`: emit **both** the old v1.7.0 and the new (stable) v1.23.0+ semantics
- By default, if `OTEL_SEMCONV_STABILITY_OPT_IN` includes neither of the above tokens, the old v1.7.0 semconv is used.

### Attributes collected

The following semconv attributes are collected on hapi route spans:

| v1.7.0 semconv | v1.23.0 semconv       | Notes                                       |
|----------------|-----------------------|---------------------------------------------|
| `http.method`  | `http.request.method` | HTTP request method                         |
| `http.route`   | `http.route` (same)   | Route assigned to handler. Ex: `/users/:id` |

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-hapi
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-hapi.svg
