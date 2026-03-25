# OpenTelemetry MySQL Instrumentation for Node.js

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This module provides automatic instrumentation for the [`mysql`](https://www.npmjs.com/package/mysql) module, which may be loaded using the [`@opentelemetry/sdk-trace-node`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-node) package and is included in the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle.

If total installation size is not constrained, it is recommended to use the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle with [@opentelemetry/sdk-node](`https://www.npmjs.com/package/@opentelemetry/sdk-node`) for the most seamless instrumentation experience.

Compatible with OpenTelemetry JS API and SDK `1.0+`.

## Installation

```bash
npm install --save @opentelemetry/instrumentation-mysql
```

## Supported Versions

- [`mysql`](https://www.npmjs.com/package/mysql) versions `>=2.0.0 <3`

## Usage

OpenTelemetry MySQL Instrumentation allows the user to automatically collect trace data and export them to the backend of choice, to give observability to distributed systems when working with [mysql](https://www.npmjs.com/package/mysql).

To load a specific plugin (**MySQL** in this case), specify it in the registerInstrumentations's configuration

```js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { MySQLInstrumentation } = require('@opentelemetry/instrumentation-mysql');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const provider = new NodeTracerProvider();
provider.register();

registerInstrumentations({
  instrumentations: [
    new MySQLInstrumentation(),
  ],
})
```

See [examples/mysql](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main//examples/mysql) for a short example.

### MySQL instrumentation Options

| Options                                           | Type      | Default | Description |
| ------------------------------------------------- | --------- | ------- | ----------- |
| [`enhancedDatabaseReporting`](./src/types.ts#L24) | `boolean` | `false` | If true, a `db.mysql.values` attribute containing the query's parameters will be add to database spans. Note that this is not an attribute defined in [Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/database/mysql/). |

## Semantic Conventions

This instrumentation implements Semantic Conventions (semconv) v1.7.0. Since then, networking (in semconv v1.23.1) and database (in semconv v1.33.0) semantic conventions were stabilized. As of `@opentelemetry/instrumentation-mysql@0.55.0` support has been added for migrating to the stable semantic conventions using the `OTEL_SEMCONV_STABILITY_OPT_IN` environment variable as follows:

1. Upgrade to the latest version of this instrumentation package.
2. Set `OTEL_SEMCONV_STABILITY_OPT_IN=http/dup,database/dup` to emit both old and stable semantic conventions. (The `http` token is used to control the `net.*` attributes, the `database` token to control to `db.*` attributes.)
3. Modify alerts, dashboards, metrics, and other processes in your Observability system to use the stable semantic conventions.
4. Set `OTEL_SEMCONV_STABILITY_OPT_IN=http,database` to emit only the stable semantic conventions.

By default, if `OTEL_SEMCONV_STABILITY_OPT_IN` includes neither of the above tokens, the old v1.7.0 semconv is used.
The intent is to provide an approximate 6 month time window for users of this instrumentation to migrate to the new database and networking semconv, after which a new minor version will use the new semconv by default and drop support for the old semconv.
See [the HTTP migration guide](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/) and the [database migration guide](https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/) for details.

Attributes collected:

| Old semconv            | Stable semconv   | Description |
| ---------------------- | ---------------- | ----------- |
| `db.system`            | `db.system.name` | 'mssql' (old), 'microsoft.sql_server' (stable) |
| `db.connection_string` | Removed          | The connection string used to connect to the database. |
| `db.statement`         | `db.query.text`  | The database query being executed. |
| `db.user`              | Removed          | Username for accessing the database. |
| `db.name`              | Removed          | Integrated into new `db.namespace`. |
| (not included)         | `db.namespace`   | The database associated with the connection, as provided at connection time. (This does not track changes made via `SELECT DATABASE()`.) |
| `net.peer.name`        | `server.address` | Remote hostname or similar. |
| `net.peer.port`        | `server.port`    | Remote port number. |

Metrics collected:

- [`db.client.connections.usage`](https://github.com/open-telemetry/semantic-conventions/blob/v1.24.0/docs/database/database-metrics.md#metric-dbclientconnectionsusage) - The number of connections currently in a given state.

  Note: While `db.client.connections.usage` has been deprecated in favor of `db.client.connection.count` in the [semconv database migration](https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/#database-client-connection-count), the new metric is still unstable, so cannot be enabled via `OTEL_SEMCONV_STABILITY_OPT_IN=database`. There is ongoing work to provide an opt-in setting to select the latest experimental semconv.

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-mysql
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-mysql.svg
