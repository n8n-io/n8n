# OpenTelemetry Knex Instrumentation for Node.js

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This module provides automatic instrumentation for the [`knex`](https://github.com/knex/knex) module, which may be loaded using the [`@opentelemetry/sdk-trace-node`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-node) package and is included in the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle. This module allows the user to automatically collect trace data and export them to their backend of choice.

If total installation size is not constrained, it is recommended to use the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle with [@opentelemetry/sdk-node](`https://www.npmjs.com/package/@opentelemetry/sdk-node`) for the most seamless instrumentation experience.

Compatible with OpenTelemetry JS API and SDK `1.0+`.

## Installation

```bash
npm install --save @opentelemetry/instrumentation-knex
```

### Supported Versions

- [`knex`](https://www.npmjs.com/package/knex) versions `>=0.10.0 <4`

## Usage

```js
const { KnexInstrumentation } = require('@opentelemetry/instrumentation-knex');
const { ConsoleSpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const provider = new NodeTracerProvider({
  spanProcessors: [
    new SimpleSpanProcessor(new ConsoleSpanExporter()),
  ],
});

provider.register();

registerInstrumentations({
  instrumentations: [
    new KnexInstrumentation({
        maxQueryLength: 100,
      })
  ],
  tracerProvider: provider,
});
```

### Configuration Options

| Options | Type | Example | Description |
| ------- | ---- | ------- | ----------- |
| `maxQueryLength` | `number` | `100` | Truncate `db.statement` attribute to a maximum length. If the statement is truncated `'..'` is added to it's end. Default `1022`. `-1` leaves `db.statement` untouched. |
| `requireParentSpan` | `boolean` | `false` | Don't create spans unless they are part of an existing trace. Default is `false`. |

## Semantic Conventions

This package uses `@opentelemetry/semantic-conventions` version `1.33+`, which implements Semantic Convention [Version 1.7.0](https://github.com/open-telemetry/opentelemetry-specification/blob/v1.7.0/semantic_conventions/README.md)

This package is capable of emitting both Semantic Convention [Version 1.7.0](https://github.com/open-telemetry/opentelemetry-specification/blob/v1.7.0/semantic_conventions/README.md) and [Version 1.33.0](https://github.com/open-telemetry/semantic-conventions/blob/v1.33.0/docs/database/database-spans.md)
It is controlled using the environment variable `OTEL_SEMCONV_STABILITY_OPT_IN`, which is a comma separated list of values.
The values `database` and `database/dup` control this instrumentation.
See details for the behavior of each of these values below.
If neither `database` or `database/dup` is included in `OTEL_SEMCONV_STABILITY_OPT_IN`, the old experimental semantic conventions will be used by default.

### Upgrading Semantic Conventions

When upgrading to the new semantic conventions, it is recommended to do so in the following order:

1. Upgrade `@opentelemetry/instrumentation-knex` to the latest version
2. Set `OTEL_SEMCONV_STABILITY_OPT_IN=database/dup` to emit both old and new semantic conventions
3. Modify alerts, dashboards, metrics, and other processes to expect the new semantic conventions
4. Set `OTEL_SEMCONV_STABILITY_OPT_IN=database` to emit only the new semantic conventions

This will cause both the old and new semantic conventions to be emitted during the transition period.

Attributes collected:

| v1.7.0 semconv  | v1.23.0 semconv      | Short Description                                                           |
| --------------- | -------------------- | --------------------------------------------------------------------------- |
| `db.name`       | `db.namespace`       | This attribute is used to report the name of the database being accessed.   |
| `db.operation`  | `db.operation.name`  | The name of the operation being executed.                                   |
| `db.sql.table`  | `db.collection.name` | The name of the primary table that the operation is acting upon.            |
| `db.statement`  | `db.query.text`      | The database statement being executed.                                      |
| `db.system`     | `db.system.name`     | An identifier for the database management system (DBMS) product being used. |
| `db.user`       | (not included)       | Username for accessing the database.                                        |
| `net.peer.name` | `server.address`     | Remote hostname or similar.                                                 |
| `net.peer.port` | `server.port`        | Remote port number.                                                         |
| `net.transport` | (not included)       | Transport protocol used.                                                    |

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-knex
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-knex.svg
