# OpenTelemetry mongoose Instrumentation for Node.js

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This module provides automatic instrumentation for the [`mongoose`](https://github.com/Automattic/mongoose) module, which may be loaded using the [`@opentelemetry/sdk-trace-node`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-node) package and is included in the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle.

If total installation size is not constrained, it is recommended to use the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle with [@opentelemetry/sdk-node](`https://www.npmjs.com/package/@opentelemetry/sdk-node`) for the most seamless instrumentation experience.

Compatible with OpenTelemetry JS API and SDK `1.0+`.

## Installation

```bash
npm install --save @opentelemetry/instrumentation-mongoose
```

## Supported Versions

- [`mongoose`](https://www.npmjs.com/package/mongoose) versions `>=5.9.7 <9`

## Usage

To load a specific plugin, specify it in the registerInstrumentations's configuration:

```js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { MongooseInstrumentation } = require('@opentelemetry/instrumentation-mongoose');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const provider = new NodeTracerProvider();
provider.register();

registerInstrumentations({
  instrumentations: [
    new MongooseInstrumentation(),
  ],
})
```

## Semantic Conventions

This instrumentation implements Semantic Conventions (semconv) v1.7.0. Since then, networking (in semconv v1.23.1) and database (in semconv v1.33.0) semantic conventions were stabilized. As of `@opentelemetry/instrumentation-mongoose@0.44.0` support has been added for migrating to the stable semantic conventions using the `OTEL_SEMCONV_STABILITY_OPT_IN` environment variable as follows:

1. Upgrade to the latest version of this instrumentation package.
2. Set `OTEL_SEMCONV_STABILITY_OPT_IN=http/dup,database/dup` to emit both old and stable semantic conventions. (The `http` token is used to control the `net.*` attributes, the `database` token to control the `db.*` attributes.)
3. Modify alerts, dashboards, metrics, and other processes in your Observability system to use the stable semantic conventions.
4. Set `OTEL_SEMCONV_STABILITY_OPT_IN=http,database` to emit only the stable semantic conventions.

By default, if `OTEL_SEMCONV_STABILITY_OPT_IN` includes neither of the above tokens, the old v1.7.0 semconv is used.
The intent is to provide an approximate 6 month time window for users of this instrumentation to migrate to the new database and networking semconv, after which a new minor version will use the new semconv by default and drop support for the old semconv.
See [the HTTP migration guide](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/) and the [database migration guide](https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/) for details.

Attributes collected:

| Old semconv             | Stable semconv       | Description                                                                                  |
| ----------------------- | -------------------- | -------------------------------------------------------------------------------------------- |
| `db.system`             | `db.system.name`     | An identifier for the database management system (DBMS) product being used. Value: 'mongodb' |
| `db.mongodb.collection` | `db.collection.name` | The collection being accessed within the database stated in `db.name`.                       |
| `db.name`               | `db.namespace`       | This attribute is used to report the name of the database being accessed.                    |
| `db.operation`          | `db.operation.name`  | The name of the operation being executed.                                                    |
| `db.statement`          | `db.query.text`      | The database statement being executed.                                                       |
| `db.user`               | Removed              | Username for accessing the database.                                                         |
| `net.peer.name`         | `server.address`     | Remote hostname or similar.                                                                  |
| `net.peer.port`         | `server.port`        | Remote port number.                                                                          |

Span name format:

- Old: `mongoose.{modelName}.{operation}` (e.g., `mongoose.User.save`)
- Stable: `{operation} {collection}` (e.g., `save users`)

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-mongoose
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-mongoose.svg
