# OpenTelemetry redis Instrumentation for Node.js

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This module provides automatic instrumentation for the [`redis`](https://github.com/NodeRedis/node_redis) module versions `>=2.6.0 <6`, which may be loaded using the [`@opentelemetry/sdk-trace-node`](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-node) package and is included in the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle.

If total installation size is not constrained, it is recommended to use the [`@opentelemetry/auto-instrumentations-node`](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) bundle with [@opentelemetry/sdk-node](`https://www.npmjs.com/package/@opentelemetry/sdk-node`) for the most seamless instrumentation experience.

Compatible with OpenTelemetry JS API and SDK `1.0+`.

## Installation

```bash
npm install --save @opentelemetry/instrumentation-redis
```

### Supported Versions

- [`redis`](https://www.npmjs.com/package/redis) versions `>=2.6.0 <6`

## Usage

OpenTelemetry Redis Instrumentation allows the user to automatically collect trace data and export them to the backend of choice, to give observability to distributed systems when working with [redis](https://www.npmjs.com/package/redis).

To load a specific instrumentation (**redis** in this case), specify it in the registerInstrumentations' configuration

```javascript
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { RedisInstrumentation } = require('@opentelemetry/instrumentation-redis');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const provider = new NodeTracerProvider();
provider.register();

registerInstrumentations({
  instrumentations: [
    new RedisInstrumentation(),
  ],
})
```

See [examples/redis](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/examples/redis) for a short example.

### Redis Instrumentation Options

Redis instrumentation has a few options available to choose from. You can set the following:

| Options                 | Type                                              | Description                                                                                                    |
|-------------------------|---------------------------------------------------|----------------------------------------------------------------------------------------------------------------|
| `dbStatementSerializer` | `DbStatementSerializer` (function)                | Redis instrumentation will serialize the command to the `db.statement` attribute using the specified function. |
| `responseHook`          | `RedisResponseCustomAttributeFunction` (function) | Function for adding custom attributes on db response. Receives params: `span, moduleVersion, cmdName, cmdArgs` |
| `requireParentSpan`     | `boolean`                                         | Require parent to create redis span, default when unset is false.                                              |

#### Custom `db.statement` Serializer

The instrumentation serializes the command into a Span attribute called `db.statement`. The standard serialization format attempts to be as informative as possible while avoiding the export of potentially sensitive data. The number of serialized arguments depends on the specific command, see the configuration
list in `@opentelemetry/redis-common`.

It is also possible to define a custom serialization function. The function
will receive the command name and arguments and must return a string.

Here is a simple example to serialize the command name and all command arguments.
Notice that it might capture sensitive data and big payloads:

```javascript
const { RedisInstrumentation } = require('@opentelemetry/instrumentation-redis');

const redisInstrumentation = new RedisInstrumentation({
  dbStatementSerializer: function (cmdName, cmdArgs) {
    return [cmdName, ...cmdArgs].join(" ");
  },
});
```

## Semantic Conventions


This package uses `@opentelemetry/semantic-conventions` version `1.22+`, which implements Semantic Convention [Version 1.7.0](https://github.com/open-telemetry/opentelemetry-specification/blob/v1.7.0/semantic_conventions/README.md) ("old" conventions).

It also supports the new stable semantic conventions introduced in [Version 1.33.0]
By default, old semantic conventions are used. Use the `OTEL_SEMCONV_STABILITY_OPT_IN` environment variable to control which version to emit.

Attributes collected:

### Old Semantic Conventions (default)

| Attribute              | Short Description                                            |
|------------------------|--------------------------------------------------------------|
| `db.connection_string` | URL to Redis server address, of the form `redis://host:port` |
| `db.statement`         | Executed Redis statement                                     |
| `db.system`            | Database identifier; always `redis`                          |
| `net.peer.name`        | Hostname or IP of the connected Redis server                 |
| `net.peer.port`        | Port of the connected Redis server                           |

### Stable Semantic Conventions (v1.33.0)

| Attribute                 | Short Description                                      |
|---------------------------|--------------------------------------------------------|
| `db.operation.name`       | Redis command name                                     |
| `db.operation.batch.size` | Number of commands in a Redis `MULTI/EXEC` transaction |
| `db.query.text`           | The database query being executed                      |
| `db.system.name`          | Database identifier; always `redis`                    |
| `server.address`          | Hostname or IP of the connected Redis server           |
| `server.port`             | Port of the connected Redis server                     |

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-redis
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-redis.svg
