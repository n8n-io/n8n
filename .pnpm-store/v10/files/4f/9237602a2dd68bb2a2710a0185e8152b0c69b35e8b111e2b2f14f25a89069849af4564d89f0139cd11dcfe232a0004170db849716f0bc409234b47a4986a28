# OpenTelemetry `fs` Instrumentation for Node.js

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This module provides automatic instrumentation for the [`fs`](http://nodejs.org/dist/latest/docs/api/fs.html) module, which can be registered using the [`@opentelemetry/instrumentation`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-instrumentation) package.

Compatible with OpenTelemetry JS API `1.3+`.

See the full list of instrumented functions in [constants.ts](src/constants.ts);

## Installation

```bash
npm install --save @opentelemetry/instrumentation-fs
```

## Supported Versions

- Node.js `>=18`

## Usage

```js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { FsInstrumentation } = require('@opentelemetry/instrumentation-fs');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const provider = new NodeTracerProvider();
provider.register();

registerInstrumentations({
  instrumentations: [
    new FsInstrumentation({
      // see below for available configuration
    }),
  ],
});
```

### Instrumentation Options

You can set the following:

| Options             | Type                                                                                                | Description                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `createHook`        | `(functionName: FMember \| FPMember, info: { args: ArrayLike<unknown> }) => boolean`                | Hook called before creating the span. If `false` is returned this and all the sibling calls will not be traced. |
| `endHook`           | `( functionName: FMember \| FPMember, info: { args: ArrayLike<unknown>; span: api.Span } ) => void` | Function called just before the span is ended. Useful for adding attributes.                                    |
| `requireParentSpan` | `boolean`                                                                                           | Require parent to create fs span, default when unset is `false`.                                                |

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
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-fs
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-fs.svg
