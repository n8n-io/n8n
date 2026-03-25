# OpenTelemetry MongoDB Instrumentation for Node.js

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This module provides automatic instrumentation for the [`mongodb`](https://github.com/mongodb/node-mongodb-native) module, which may be loaded using the [`@opentelemetry/sdk-trace-node`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-node) package and is included in the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle.

If total installation size is not constrained, it is recommended to use the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle with [@opentelemetry/sdk-node](`https://www.npmjs.com/package/@opentelemetry/sdk-node`) for the most seamless instrumentation experience.

Compatible with OpenTelemetry JS API and SDK `1.0+`.

## Installation

```bash
npm install --save @opentelemetry/instrumentation-mongodb
```

### Supported Versions

- [`mongodb`](https://www.npmjs.com/package/mongodb) version `>=3.3.0 <8`

## Usage

OpenTelemetry MongoDB Instrumentation allows the user to automatically collect trace data and export them to their backend of choice, to give observability to distributed systems.

To load a specific instrumentation (**mongodb** in this case), specify it in the Node Tracer's configuration.

```javascript
const { MongoDBInstrumentation } = require('@opentelemetry/instrumentation-mongodb');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const provider = new NodeTracerProvider();
provider.register();

registerInstrumentations({
  instrumentations: [
    new MongoDBInstrumentation({
      // see under for available configuration
    }),
  ],
});

```

See [`examples/mongodb`](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/examples/mongodb) for a short example.

### Mongo instrumentation Options

Mongodb instrumentation has few options available to choose from. You can set the following:

| Options                     | Type     | Description |
| --------------------------- | -------- | ----------- |
| `enhancedDatabaseReporting` | boolean  | If true, additional information about query parameters and results will be attached (as `attributes`) to spans representing database operations. |
| `responseHook`              | function | Function for adding custom attributes from db response. See type `MongoDBInstrumentationExecutionResponseHook`. |
| `dbStatementSerializer`     | function | Custom serializer function for the `db.statement` / `db.query.text` span attribute. See type `DbStatementSerializer`. |
| `requireParentSpan`         | boolean  | Require a parent span in order to create mongodb spans, default when unset is `true`. |

## Semantic Conventions

This instrumentation implements Semantic Conventions (semconv) v1.7.0. Since then, networking (in semconv v1.23.1) and database (in semconv v1.33.0) semantic conventions were stabilized. As of `@opentelemetry/instrumentation-mongodb@0.63.0` support has been added for migrating to the stable semantic conventions using the `OTEL_SEMCONV_STABILITY_OPT_IN` environment variable as follows:

1. Upgrade to the latest version of this instrumentation package.
2. Set `OTEL_SEMCONV_STABILITY_OPT_IN=http/dup,database/dup` to emit both old and stable semantic conventions. (The `http` token is used to control the `net.*` attributes, the `database` token to control to `db.*` attributes.)
3. Modify alerts, dashboards, metrics, and other processes in your Observability system to use the stable semantic conventions.
4. Set `OTEL_SEMCONV_STABILITY_OPT_IN=http,database` to emit only the stable semantic conventions.

By default, if `OTEL_SEMCONV_STABILITY_OPT_IN` includes neither of the above tokens, the old v1.7.0 semconv is used.
The intent is to provide an approximate 6 month time window for users of this instrumentation to migrate to the new database and networking semconv, after which a new minor version will use the new semconv by default and drop support for the old semconv.
See [the HTTP migration guide](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/) and the [database migration guide](https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/) for details.

Span attributes:

| Old semconv             | Stable semconv       | Description |
| ----------------------- | -------------------- | ----------- |
| `db.system`             | `db.system.name`     | 'mongodb'   |
| `db.name`               | `db.namespace`       | The MongoDB database name. |
| `db.connection_string`  | Removed              |             |
| `db.operation`          | `db.operation.name`  | The name of the MongoDB command being executed. |
| `db.mongodb.collection` | `db.collection.name` | The MongoDB collection being accessed within the database stated in `db.namespace`. |
| `db.statement`          | `db.query.text`      | The database query being executed. |
| `net.peer.name`         | `server.address`     | Remote hostname or similar. |
| `net.peer.port`         | `server.port`        | Remote port number. |

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
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-mongodb
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-mongodb.svg
