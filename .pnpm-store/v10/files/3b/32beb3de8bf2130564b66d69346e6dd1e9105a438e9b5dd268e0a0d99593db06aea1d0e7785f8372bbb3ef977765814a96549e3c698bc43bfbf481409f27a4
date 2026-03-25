# OpenTelemetry Undici/fetch Instrumentation for Node.js

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

**Note: This is an experimental package under active development. New releases may include breaking changes.**

This module provides automatic instrumentation for [`undici`](https://undici.nodejs.org/) and Node.js global [`fetch`](https://nodejs.org/docs/latest/api/globals.html#fetch) API.
If you're looking the instrumentation for browser's `fetch` API it is located at [https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-instrumentation-fetch/](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-instrumentation-fetch/)

## Installation

```bash
npm install --save @opentelemetry/instrumentation-undici
```

## Supported Versions

- [`undici`](https://www.npmjs.com/package/undici) version `>=5.12.0`

## Usage

OpenTelemetry Undici/fetch Instrumentation allows the user to automatically collect trace data and export them to their backend of choice, to give observability to distributed systems.

To load a specific instrumentation (Undici in this case), specify it in the Node Tracer's configuration.

```js
const {
  UndiciInstrumentation,
} = require('@opentelemetry/instrumentation-undici');
const {
  ConsoleSpanExporter,
  NodeTracerProvider,
  SimpleSpanProcessor,
} = require('@opentelemetry/sdk-trace-node');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');

const provider = new NodeTracerProvider({
  spanProcessors: [
    new SimpleSpanProcessor(new ConsoleSpanExporter()),
  ],
});

provider.register();

registerInstrumentations({
  instrumentations: [new UndiciInstrumentation()],
});
```

### Undici/Fetch instrumentation Options

Undici instrumentation has few options available to choose from. You can set the following:

| Options                                                                                                                                            | Type                    | Description                                                                                                                                                                                                                                                  |
|----------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [`ignoreRequestHook`](https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/packages/instrumentation-undici/src/types.ts#L73)       | `IgnoreRequestFunction` | Undici instrumentation will not trace all incoming requests that matched with custom function.                                                                                                                                                               |
| [`requestHook`](https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/packages/instrumentation-undici/src/types.ts#L75)             | `RequestHookFunction`   | Function for adding custom attributes before request is handled.                                                                                                                                                                                             |
| [`responseHook`](https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/packages/instrumentation-undici/src/types.ts#L77)            | `ResponseHookFunction`  | Function for adding custom attributes after the response headers are received.                                                                                                                                                                               |
| [`startSpanHook`](https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/packages/instrumentation-undici/src/types.ts#L79)           | `StartSpanHookFunction` | Function for adding custom attributes before a span is started.                                                                                                                                                                                              |
| [`requireParentforSpans`](https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/packages/instrumentation-undici/src/types.ts#L81)   | `Boolean`               | Require a parent span is present to create new span for outgoing requests.                                                                                                                                                                                   |
| [`headersToSpanAttributes`](https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/packages/instrumentation-undici/src/types.ts#L83) | `Object`                | List of case insensitive HTTP headers to convert to span attributes. Headers will be converted to span attributes in the form of `http.{request\|response}.header.header-name` where the name is only lowercased, e.g. `http.response.header.content-length` |

### Observations

This instrumentation subscribes to certain [diagnostics_channel](https://nodejs.org/api/diagnostics_channel.html) to intercept the client requests
and generate traces and metrics. In particular tracing spans are started when [undici:request:create](https://undici.nodejs.org/#/docs/api/DiagnosticsChannel?id=undicirequestcreate)
channel receives a message and ended when [undici:request:trailers](https://undici.nodejs.org/#/docs/api/DiagnosticsChannel?id=undicirequesttrailers) channel receive a message.
This means the full response body has been received when the instrumentation ends the span.

## Semantic Conventions

This package uses Semantic Conventions [Version 1.24.0](https://github.com/open-telemetry/semantic-conventions/tree/v1.24.0/docs/http). As for now the Semantic Conventions
are bundled in this package but eventually will be imported from `@opentelemetry/semantic-conventions` package when it is updated to latest version.
Ref: [opentelemetry-js/issues/4235](https://github.com/open-telemetry/opentelemetry-js/issues/4235)

Attributes collected:

| Attribute                      | Short Description                                                                                          |
|--------------------------------|------------------------------------------------------------------------------------------------------------|
| `error.type`                   | Describes a class of error the operation ended with.                                                       |
| `http.request.method`          | HTTP request method.                                                                                       |
| `http.request.method_original` | Original HTTP method sent by the client in the request line.                                               |
| `http.response.status_code`    | [HTTP response status code](https://tools.ietf.org/html/rfc7231#section-6).                                |
| `network.peer.address`         | Peer address of the network connection - IP address or Unix domain socket name.                            |
| `network.peer.port`            | Peer port number of the network connection.                                                                |
| `server.address`               | Server domain name, IP address or Unix domain socket name.                                                 |
| `server.port`                  | Server port number.                                                                                        |
| `url.full`                     | Absolute URL describing a network resource according to [RFC3986](https://www.rfc-editor.org/rfc/rfc3986). |
| `url.path`                     | The [URI path](https://www.rfc-editor.org/rfc/rfc3986#section-3.3) component.                              |
| `url.query`                    | The [URI query](https://www.rfc-editor.org/rfc/rfc3986#section-3.4) component.                             |
| `url.scheme`                   | HTTP request method.                                                                                       |
| `user_agent.original`          | Value of the HTTP User-Agent header sent by the client.                                                    |

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/instrumentation-undici
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Finstrumentation-undici.svg
