# OpenTelemetry Connect Instrumentation for Node.js

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This module provides automatic instrumentation for the [`connect`](https://github.com/senchalabs/connect) module, which may be loaded using the [`@opentelemetry/sdk-trace-node`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-node) package and is included in the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle.

If total installation size is not constrained, it is recommended to use the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle with [@opentelemetry/sdk-node](`https://www.npmjs.com/package/@opentelemetry/sdk-node`) for the most seamless instrumentation experience.

Compatible with OpenTelemetry JS API and SDK `1.0+`.

## Status

| Maturity                                           | [Component Owner](../../.github/component_owners.yml) | Compatibility         |
|----------------------------------------------------|-------------------------------------------------------|-----------------------|
| [Unmaintained](../../CONTRIBUTING.md#unmaintained) | N/A                                                   | API 1.0+<br/>SDK 1.0+ |

## Installation

This instrumentation relies on HTTP calls to also be instrumented. Make sure you install and enable both, otherwise you will have spans that are not connected to each other.

```bash
npm install --save @opentelemetry/instrumentation-http @opentelemetry/instrumentation-connect
```

### Supported Versions

- [`connect`](https://www.npmjs.com/package/connect) versions `>=3.0.0 <4`

## Usage

OpenTelemetry Connect Instrumentation allows the user to automatically collect trace data and export them to their backend of choice, to give observability to distributed systems.

To load the instrumentation, specify it in the Node Tracer's configuration:

```js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ConnectInstrumentation } = require('@opentelemetry/instrumentation-connnect');

const provider = new NodeTracerProvider();
provider.register();

registerInstrumentations({
  instrumentations: [
    // Connect instrumentation expects HTTP layer to be instrumented
    new HttpInstrumentation(),
    new ConnectInstrumentation(),
  ],
});
```

See [examples/connect](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/examples/connect) for a short example.

## Semantic Conventions

This package implements Semantic Convention v1.33.1.

Attributes collected:

| Attribute    | Short Description                  |
|--------------|------------------------------------|
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
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-connect
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-connect.svg
