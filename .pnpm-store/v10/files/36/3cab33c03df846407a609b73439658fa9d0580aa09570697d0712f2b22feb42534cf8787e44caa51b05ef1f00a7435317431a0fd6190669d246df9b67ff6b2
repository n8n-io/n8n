# OpenTelemetry Tedious Instrumentation for Node.js

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This module provides automatic instrumentation for the [`tedious`](https://github.com/tediousjs/tedious) module, which may be loaded using the [`@opentelemetry/sdk-trace-node`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-node) package and is included in the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle.

If total installation size is not constrained, it is recommended to use the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle with [@opentelemetry/sdk-node](`https://www.npmjs.com/package/@opentelemetry/sdk-node`) for the most seamless instrumentation experience.

Compatible with OpenTelemetry JS API and SDK `1.0+`.

## Installation

```bash
npm install --save @opentelemetry/instrumentation-tedious
```

## Supported Versions

- [tedious](https://www.npmjs.com/package/tedious) `>=1.11.0 <20`

## Usage

OpenTelemetry Tedious Instrumentation allows the user to automatically collect trace data and export them to the backend of choice, to give observability to distributed systems when working with [`tedious`](https://github.com/tediousjs/tedious).

To load a specific plugin, specify it in the registerInstrumentations's configuration:

```js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { TediousInstrumentation } = require('@opentelemetry/instrumentation-tedious');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const provider = new NodeTracerProvider();
provider.register();

registerInstrumentations({
  instrumentations: [
    new TediousInstrumentation(),
  ],
})
```

## Semantic Conventions

This instrumentation implements Semantic Conventions (semconv) v1.7.0. Since then, networking (in semconv v1.23.1) and database (in semconv v1.33.0) semantic conventions were stabilized. As of `@opentelemetry/instrumentation-tedious@0.28.0` support has been added for migrating to the stable semantic conventions using the `OTEL_SEMCONV_STABILITY_OPT_IN` environment variable as follows:

1. Upgrade to the latest version of this instrumentation package.
2. Set `OTEL_SEMCONV_STABILITY_OPT_IN=http/dup,database/dup` to emit both old and stable semantic conventions. (The `http` token is used to control the `net.*` attributes, the `database` token to control to `db.*` attributes.)
3. Modify alerts, dashboards, metrics, and other processes in your Observability system to use the stable semantic conventions.
4. Set `OTEL_SEMCONV_STABILITY_OPT_IN=http,database` to emit only the stable semantic conventions.

By default, if `OTEL_SEMCONV_STABILITY_OPT_IN` includes neither of the above tokens, the old v1.7.0 semconv is used.
The intent is to provide an approximate 6 month time window for users of this instrumentation to migrate to the new database and networking semconv, after which a new minor version will use the new semconv by default and drop support for the old semconv.
See [the HTTP migration guide](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/) and the [database migration guide](https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/) for details.

Attributes collected:

| Old semconv     | Stable semconv       | Description                        |
| --------------- | -------------------- | ---------------------------------- |
| `db.system`     | `db.system.name`     | 'mssql' (old), 'microsoft.sql_server' (stable) |
| `db.statement`  | `db.query.text`      | The database query being executed. |
| `db.user`       | Removed              | Username for accessing the database. |
| `db.name`       | Removed              | Integrated into new `db.namespace`. |
| (not included)  | `db.namespace`       | The database associated with the connection, qualified by the instance name. |
| `db.sql.table`  | `db.collection.name` | The name of a collection (table, container) within the database. |
| `net.peer.name` | `server.address`     | Remote hostname or similar.        |
| `net.peer.port` | `server.port`        | Remote port number.                |

### Trace Context Propagation

Database trace context propagation can be enabled by setting `enableTraceContextPropagation`to `true`.
This uses the [SET CONTEXT_INFO](https://learn.microsoft.com/en-us/sql/t-sql/statements/set-context-info-transact-sql?view=sql-server-ver16)
command to set [traceparent](https://www.w3.org/TR/trace-context/#traceparent-header)information
for the current connection, which results in **an additional round-trip to the database**.

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-tedious
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-tedious.svg
