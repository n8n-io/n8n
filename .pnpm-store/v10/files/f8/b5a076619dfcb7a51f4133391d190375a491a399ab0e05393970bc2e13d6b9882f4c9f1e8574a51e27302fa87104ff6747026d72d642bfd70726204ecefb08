# OpenTelemetry instrumentation for dataloader

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This module provides automatic instrumentation for the injection of trace context to [`dataloader`](https://www.npmjs.com/package/dataloader), which may be loaded using the [`@opentelemetry/sdk-trace-node`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-node) package and is included in the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle.

If total installation size is not constrained, it is recommended to use the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle with [@opentelemetry/sdk-node](`https://www.npmjs.com/package/@opentelemetry/sdk-node`) for the most seamless instrumentation experience.

Compatible with OpenTelemetry JS API and SDK `1.0+`.

## Installation

```bash
npm install --save @opentelemetry/instrumentation-dataloader
```

## Supported Versions

- [`dataloader`](https://www.npmjs.com/package/dataloader) versions `>=2.0.0 <3`

## Usage

```js
const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");
const {
  DataloaderInstrumentation,
} = require("@opentelemetry/instrumentation-dataloader");
const { registerInstrumentations } = require("@opentelemetry/instrumentation");

const provider = new NodeTracerProvider();
provider.register();

registerInstrumentations({
  instrumentations: [
    new DataloaderInstrumentation(),
    // other instrumentations
  ],
});
```

### Dataloader Instrumentation Options

Dataloader instrumentation has some configuration options

| Options             | Type      | Description                                                                             |
| ------------------- | --------- | --------------------------------------------------------------------------------------- |
| `requireParentSpan` | `boolean` | Require a parent span in order to create dataloader spans, default when unset is false. |

### Spans created

Each call to `.load` or `.loadMany` will create a child span for the current active span.

The batch load function of the dataloader also creates a span, which links to spans created as part of `.load` and `.loadMany`, it is a child span of whatever the active span is during which the dataloader is created.

## Semantic Conventions

This package does not currently generate any attributes from semantic conventions.

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-dataloader
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-dataloader.svg
