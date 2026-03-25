# OpenTelemetry ioredis Instrumentation for Node.js

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This module provides automatic instrumentation for the [`ioredis`](https://github.com/luin/ioredis) module, which may be loaded using the [`@opentelemetry/sdk-trace-node`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-node) package and is included in the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle.

If total installation size is not constrained, it is recommended to use the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle with [@opentelemetry/sdk-node](`https://www.npmjs.com/package/@opentelemetry/sdk-node`) for the most seamless instrumentation experience.

Compatible with OpenTelemetry JS API and SDK `1.0+`.

## Installation

```sh
npm install --save @opentelemetry/instrumentation-ioredis
```

### Supported Versions

- [`ioredis`](https://www.npmjs.com/package/ioredis) versions `>=2.0.0 <6`

## Usage

To load a specific instrumentation (**ioredis** in this case), specify it in the registerInstrumentations's configuration

```javascript
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const {
  IORedisInstrumentation,
} = require('@opentelemetry/instrumentation-ioredis');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const provider = new NodeTracerProvider();
provider.register();

registerInstrumentations({
  instrumentations: [
    new IORedisInstrumentation({
      // see under for available configuration
    }),
  ],
});
```

### IORedis Instrumentation Options

IORedis instrumentation has few options available to choose from. You can set the following:

| Options                 | Type                                              | Description |
| ----------------------- | ------------------------------------------------- | ----------- |
| `dbStatementSerializer` | `DbStatementSerializer`                           | IORedis instrumentation will serialize db.statement using the specified function. |
| `requestHook`           | `RedisRequestCustomAttributeFunction` (function)  | Function for adding custom attributes on db request. Receives params: `span, { moduleVersion, cmdName, cmdArgs }` |
| `responseHook`          | `RedisResponseCustomAttributeFunction` (function) | Function for adding custom attributes on db response |
| `requireParentSpan`     | `boolean`                                         | Require parent to create ioredis span, default when unset is true |

#### Custom db.statement Serializer

The instrumentation serializes the command into a Span attribute called `db.statement`. The standard serialization format attempts to be as informative
as possible while avoiding the export of potentially sensitive data. The number of serialized arguments depends on the specific command, see the configuration
list in `@opentelemetry/redis-common`.

It is also possible to define a custom serialization function. The function will receive the command name and arguments and must return a string.

Here is a simple example to serialize the command name skipping arguments:

```javascript
const { IORedisInstrumentation } = require('@opentelemetry/instrumentation-ioredis');

const ioredisInstrumentation = new IORedisInstrumentation({
  dbStatementSerializer: function (cmdName, cmdArgs) {
    return cmdName;
  },
});
```

#### Using `requestHook`

Instrumentation user can configure a custom "hook" function which will be called on every request with the relevant span and request information. User can then set custom attributes on the span or run any instrumentation-extension logic per request.

Here is a simple example that adds a span attribute of `ioredis` instrumented version on each request:

```javascript
const { IORedisInstrumentation } = require('@opentelemetry/instrumentation-ioredis');

const ioredisInstrumentation = new IORedisInstrumentation({
requestHook: function (
    span: Span,
    requestInfo: IORedisRequestHookInformation
  ) {
    if (requestInfo.moduleVersion) {
      span.setAttribute(
        'instrumented_library.version',
        requestInfo.moduleVersion
      );
    }
  }
});

```

## Semantic Conventions

This instrumentation implements Semantic Conventions (semconv) v1.7.0. Since then, networking (in semconv v1.23.1) and database (in semconv v1.33.0) semantic conventions were stabilized. As of `@opentelemetry/instrumentation-ioredis@0.57.0` support has been added for migrating to the stable semantic conventions using the `OTEL_SEMCONV_STABILITY_OPT_IN` environment variable as follows:

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
| `db.connection_string` | Removed          |             |
| `db.system`            | `db.system.name` | 'redis'     |
| `db.statement`         | `db.query.text`  | The database query being executed. |
| `net.peer.port`        | `server.port`    | Remote port number. |
| `net.peer.name`        | `server.address` | Remote hostname or similar. |


## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-ioredis
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-ioredis.svg
