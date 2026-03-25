# OpenTelemetry HTTP and HTTPS Instrumentation for Node.js

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

**Note: This is an experimental package under active development. New releases may include breaking changes.**

This module provides automatic instrumentation for [`http`](https://nodejs.org/api/http.html) and [`https`](https://nodejs.org/api/https.html).

For automatic instrumentation see the
[@opentelemetry/sdk-trace-node](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-sdk-trace-node) package.

## Installation

```bash
npm install --save @opentelemetry/instrumentation-http
```

## Supported Versions

- Nodejs `>=14`

## Usage

OpenTelemetry HTTP Instrumentation allows the user to automatically collect telemetry and export it to their backend of choice, to give observability to distributed systems.

To load a specific instrumentation (HTTP in this case), specify it in the Node Tracer's configuration.

```js
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const {
  ConsoleSpanExporter,
  NodeTracerProvider,
  SimpleSpanProcessor,
} = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const provider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())]
});

provider.register();

registerInstrumentations({
  instrumentations: [new HttpInstrumentation()],
});

```

See [examples/http](https://github.com/open-telemetry/opentelemetry-js/tree/main/examples/http) for a short example.

### Http instrumentation Options

Http instrumentation has a few [configuration options](https://github.com/open-telemetry/opentelemetry-js/blob/e1ec4026edae53a2dea3a9a604d6d21bb5e8d99f/experimental/packages/opentelemetry-instrumentation-http/src/types.ts#L60-L93) available to choose from.
You can set the following:

| Options                                 | Type                                       | Description                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `applyCustomAttributesOnSpan`           | `HttpCustomAttributeFunction`              | Function for adding custom attributes                                                                                                                                                                                                                                                                                        |
| `requestHook`                           | `HttpRequestCustomAttributeFunction`       | Function for adding custom attributes before request is handled                                                                                                                                                                                                                                                              |
| `responseHook`                          | `HttpResponseCustomAttributeFunction`      | Function for adding custom attributes before response is handled                                                                                                                                                                                                                                                             |
| `startIncomingSpanHook`                 | `StartIncomingSpanCustomAttributeFunction` | Function for adding custom attributes before a span is started in incomingRequest                                                                                                                                                                                                                                            |
| `startOutgoingSpanHook`                 | `StartOutgoingSpanCustomAttributeFunction` | Function for adding custom attributes before a span is started in outgoingRequest                                                                                                                                                                                                                                            |
| `ignoreIncomingRequestHook`             | `IgnoreIncomingRequestFunction`            | Http instrumentation will not trace all incoming requests that matched with custom function                                                                                                                                                                                                                                  |
| `ignoreOutgoingRequestHook`             | `IgnoreOutgoingRequestFunction`            | Http instrumentation will not trace all outgoing requests that matched with custom function                                                                                                                                                                                                                                  |
| `disableOutgoingRequestInstrumentation` | `boolean`                                  | Set to true to avoid instrumenting outgoing requests at all. This can be helpful when another instrumentation handles outgoing requests.                                                                                                                                                                                     |
| `disableIncomingRequestInstrumentation` | `boolean`                                  | Set to true to avoid instrumenting incoming requests at all. This can be helpful when another instrumentation handles incoming requests.                                                                                                                                                                                     |
| `serverName`                            | `string`                                   | The primary server name of the matched virtual host.                                                                                                                                                                                                                                                                         |
| `requireParentforOutgoingSpans`         | Boolean                                    | Require that is a parent span to create new span for outgoing requests.                                                                                                                                                                                                                                                      |
| `requireParentforIncomingSpans`         | Boolean                                    | Require that is a parent span to create new span for incoming requests.                                                                                                                                                                                                                                                      |
| `headersToSpanAttributes`               | `object`                                   | List of case insensitive HTTP headers to convert to span attributes. Client (outgoing requests, incoming responses) and server (incoming requests, outgoing responses) headers will be converted to span attributes in the form of `http.{request\|response}.header.header_name`, e.g. `http.response.header.content_length` |

## Semantic Conventions

Prior to version `0.54.0`, this instrumentation created spans targeting an experimental semantic convention [Version 1.7.0](https://github.com/open-telemetry/opentelemetry-specification/blob/v1.7.0/semantic_conventions/README.md).

HTTP semantic conventions (semconv) were stabilized in v1.23.0, and a [migration process](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/non-normative/http-migration.md#http-semantic-convention-stability-migration) was defined.
`instrumentation-http` versions 0.54.0 and later include support for migrating to stable HTTP semantic conventions, as described below.
The intent is to provide an approximate 6 month time window for users of this instrumentation to migrate to the new HTTP semconv, after which a new minor version will use the *new* semconv by default and drop support for the old semconv.
See the [HTTP semconv migration plan for OpenTelemetry JS instrumentations](https://github.com/open-telemetry/opentelemetry-js/issues/5646).

To select which semconv version(s) is emitted from this instrumentation, use the `OTEL_SEMCONV_STABILITY_OPT_IN` environment variable.

- `http`: emit the new (stable) v1.23.0+ semantics
- `http/dup`: emit **both** the old v1.7.0 and the new (stable) v1.23.0+ semantics
- By default, if `OTEL_SEMCONV_STABILITY_OPT_IN` includes neither of the above tokens, the old v1.7.0 semconv is used.

### Attributes collected

| v1.7.0 semconv                              | v1.23.0 semconv                     | Short Description                                                                                                                                                                 |
| ------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `http.client_ip`                            | `client.address`                    | The IP address of the original client behind all proxies, if known                                                                                                                |
| `http.flavor`                               | `network.protocol.version`          | Kind of HTTP protocol used                                                                                                                                                        |
| `http.host`                                 | `server.address`                    | The value of the HTTP host header                                                                                                                                                 |
| `http.method`                               | `http.request.method`               | HTTP request method                                                                                                                                                               |
| `http.request_content_length`               | (opt-in, `headersToSpanAttributes`) | The size of the request payload body in bytes. For newer semconv, use the `headersToSpanAttributes:` option to capture this as `http.request.header.content_length`.              |
| `http.request_content_length_uncompressed`  | (not included)                      | The size of the uncompressed request payload body after transport decoding. (In semconv v1.23.0 this is defined by `http.request.body.size`, which is experimental and opt-in.)   |
| `http.response_content_length`              | (opt-in, `headersToSpanAttributes`) | The size of the response payload body in bytes. For newer semconv, use the `headersToSpanAttributes:` option to capture this as `http.response.header.content_length`.            |
| `http.response_content_length_uncompressed` | (not included)                      | The size of the uncompressed response payload body after transport decoding. (In semconv v1.23.0 this is defined by `http.response.body.size`, which is experimental and opt-in.) |
| `http.route`                                | no change                           | The matched route (path template).                                                                                                                                                |
| `http.scheme`                               | `url.scheme`                        | The URI scheme identifying the used protocol                                                                                                                                      |
| `http.server_name`                          | `server.address`                    | The primary server name of the matched virtual host                                                                                                                               |
| `http.status_code`                          | `http.response.status_code`         | HTTP response status code                                                                                                                                                         |
| `http.target`                               | `url.path` and `url.query`          | The URI path and query component                                                                                                                                                  |
| `http.url`                                  | `url.full`                          | Full HTTP request URL in the form `scheme://host[:port]/path?query[#fragment]`                                                                                                    |
| `http.user_agent`                           | `user_agent.original`               | Value of the HTTP User-Agent header sent by the client                                                                                                                            |
| `net.host.ip`                               | `network.local.address`             | Like net.peer.ip but for the host IP. Useful in case of a multi-IP host                                                                                                           |
| `net.host.name`                             | `server.address`                    | Local hostname or similar                                                                                                                                                         |
| `net.host.port`                             | `server.port`                       | Like net.peer.port but for the host port                                                                                                                                          |
| `net.peer.ip.`                              | `network.peer.address`              | Remote address of the peer (dotted decimal for IPv4 or RFC5952 for IPv6)                                                                                                          |
| `net.peer.name`                             | `server.address`                    | Server domain name if available without reverse DNS lookup                                                                                                                        |
| `net.peer.port`                             | `server.port`                       | Server port number                                                                                                                                                                |
| `net.transport`                             | `network.transport`                 | Transport protocol used                                                                                                                                                           |

Metrics Exported:

- [`http.server.request.duration`](https://github.com/open-telemetry/semantic-conventions/blob/v1.27.0/docs/http/http-metrics.md#metric-httpserverrequestduration)
- [`http.client.request.duration`](https://github.com/open-telemetry/semantic-conventions/blob/v1.27.0/docs/http/http-metrics.md#metric-httpclientrequestduration)

### Upgrading Semantic Conventions

When upgrading to the new semantic conventions, it is recommended to do so in the following order:

1. Upgrade `@opentelemetry/instrumentation-http` to the latest version
2. Set `OTEL_SEMCONV_STABILITY_OPT_IN=http/dup` to emit both old and new semantic conventions
3. Modify alerts, dashboards, metrics, and other processes to expect the new semantic conventions
4. Set `OTEL_SEMCONV_STABILITY_OPT_IN=http` to emit only the new semantic conventions

This will cause both the old and new semantic conventions to be emitted during the transition period.

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-http
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-http.svg
