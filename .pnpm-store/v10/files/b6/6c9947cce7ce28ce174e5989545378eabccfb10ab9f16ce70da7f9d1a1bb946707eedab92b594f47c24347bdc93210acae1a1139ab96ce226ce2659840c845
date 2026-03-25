# OpenTelemetry Postgres Instrumentation for Node.js

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This module provides automatic instrumentation for the [`pg`](https://github.com/brianc/node-postgres)module, which may be loaded using the [`@opentelemetry/sdk-trace-node`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-node) package and is included in the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle.

If total installation size is not constrained, it is recommended to use the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle with [@opentelemetry/sdk-node](`https://www.npmjs.com/package/@opentelemetry/sdk-node`) for the most seamless instrumentation experience.

Compatible with OpenTelemetry JS API and SDK `1.0+`.

## Installation

```bash
npm install --save @opentelemetry/instrumentation-pg
```

### Supported Versions

- [`pg`](https://www.npmjs.com/package/pg) versions `>=8.0.3 <9`
- [`pg-pool`](https://www.npmjs.com/package/pg-pool) versions `>=2.0.0 <4`

## Usage

```js
const { PgInstrumentation } = require('@opentelemetry/instrumentation-pg');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const provider = new NodeTracerProvider();
provider.register();

registerInstrumentations({
  instrumentations: [
    new PgInstrumentation(),
  ],
});
```

PgInstrumentation contains both pg and [`pg.Pool`](https://node-postgres.com/api/pool) so it will be instrumented automatically.

### Span Types Created

This instrumentation creates the following span types:

| Span Name | Description | When Created |
| --------- | ----------- | ------------ |
| `pg.query:<OPERATION> <database>` | Database query execution | When `client.query()` is called |
| `pg.connect` | Client connection to database | When `new Client().connect()` is called directly |
| `pg-pool.connect` | Pool connection acquisition wait time | When acquiring a connection from `pg-pool` |

The `pg-pool.connect` spans measure the time spent waiting to acquire a connection from the pool. This can be valuable for identifying connection pool exhaustion or sizing issues. However, in high-throughput scenarios where connections are readily available, these spans may add noise with minimal diagnostic value. Consider using the `requireParentSpan` option or sampling strategies if pool connect spans become excessive.

### PostgreSQL Instrumentation Options

PostgreSQL instrumentation has few options available to choose from. You can set the following:

| Options | Type | Description |
| ------- | ---- | ----------- |
| [`enhancedDatabaseReporting`](./src/types.ts#L30) | `boolean` | If true, additional information about query parameters and results will be attached (as `attributes`) to spans representing database operations |
| `requestHook` | `PgInstrumentationExecutionRequestHook` (function) | Function for adding custom span attributes using information about the query being issued and the db to which it's directed |
| `responseHook` | `PgInstrumentationExecutionResponseHook` (function) | Function for adding custom span attributes from db response |
| `requireParentSpan` | `boolean` | If true, requires a parent span to create new spans (default false) |
| `addSqlCommenterCommentToQueries` | `boolean` | If true, adds [sqlcommenter](https://github.com/open-telemetry/opentelemetry-sqlcommenter) specification compliant comment to queries with tracing context (default false). _NOTE: A comment will not be added to queries that already contain `--` or `/* ... */` in them, even if these are not actually part of comments_ |
| `ignoreConnectSpans` | `boolean` | If true, `pg.connect` and `pg-pool.connect` spans will not be created. Query spans and pool metrics are still recorded (default false) |

## Semantic Conventions

Prior to version `0.55.0`, this instrumentation created spans and metrics targeting an experimental semantic convention Version 1.27.0.

Database semantic conventions (semconv) were stabilized in v1.34.0, and a [migration process](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/non-normative/db-migration.md) was defined.
`@opentelemetry/instrumentation-pg` versions 0.55.0 and later include support for migrating to stable Database semantic conventions, as described below.
The intent is to provide an approximate 6 month time window for users of this instrumentation to migrate to the new Database semconv, after which a new minor version will use the new semconv by default and drop support for the old semconv.

To select which semconv version(s) is emitted from this instrumentation, use the `OTEL_SEMCONV_STABILITY_OPT_IN` environment variable.

- `database`: emit the new (stable) v1.34.0+ semantics
- `database/dup`: emit **both** the old v1.27.0 and the new (stable) v1.34.0+ semantics
- By default, if `OTEL_SEMCONV_STABILITY_OPT_IN` includes neither of the above tokens, the old v1.27.0 semconv is used.

### Attributes collected

| v1.27.0 semconv         | v1.34.0 semconv                                 | Short Description                                                                          |
| ----------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `db.connection_string`  | Removed                                         | String used to connect to the database                                                     |
| `db.user`               | Removed                                         | User used to connect to the database                                                       |
| `db.name`               | Removed, integrated into the new `db.namespace` | The name of the database.                                                                  |
| (not included)          | `db.namespace`                                  | The name of the database, fully qualified within the server address and port.              |
| `db.statement`          | `db.query.text`                                 | The database query being executed.                                                         |
| `db.system`             | `db.system.name`                                | The database management system (DBMS) product as identified by the client instrumentation. |
| `net.peer.port`         | `server.port`                                   | Remote port number.                                                                        |
| `net.peer.name`         | `server.address`                                | Remote hostname or similar.                                                                |

Metrics Exported:

- [`db.client.operation.duration`](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/database/database-metrics.md#metric-dbclientoperationduration)

### Upgrading Semantic Conventions

When upgrading to the new semantic conventions, it is recommended to do so in the following order:

1. Upgrade `@opentelemetry/opentelemetry-instrumentation-pg` to the latest version
2. Set `OTEL_SEMCONV_STABILITY_OPT_IN=database/dup` to emit both old and new semantic conventions
3. Modify alerts, dashboards, metrics, and other processes to expect the new semantic conventions
4. Set `OTEL_SEMCONV_STABILITY_OPT_IN=database` to emit only the new semantic conventions

This will cause both the old and new semantic conventions to be emitted during the transition period.

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-pg
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-pg.svg
