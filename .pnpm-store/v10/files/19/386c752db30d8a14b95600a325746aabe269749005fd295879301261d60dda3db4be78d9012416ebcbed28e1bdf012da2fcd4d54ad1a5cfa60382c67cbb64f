# OpenTelemetry Collector Exporter for node with protobuf

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

**Note: This is an experimental package under active development. New releases may include breaking changes.**

This module provides a trace-exporter for OTLP (http/protobuf) using protocol version `v1.7.0`.

## Installation

```bash
npm install --save @opentelemetry/exporter-trace-otlp-proto
```

## Service Name

The OpenTelemetry Collector Exporter does not have a service name configuration.
In order to set the service name, use the `service.name` resource attribute as prescribed in the [OpenTelemetry Resource Semantic Conventions][semconv-resource-service-name].
To see documentation and sample code for the metric exporter, see the [exporter-metrics-otlp-proto package][metrics-exporter-url]

## Traces in Node - PROTO over http

```js
const { NodeTracerProvider, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-node');
const { OTLPTraceExporter } =  require('@opentelemetry/exporter-trace-otlp-proto');

const collectorOptions = {
  url: '<opentelemetry-collector-url>', // url is optional and can be omitted - default is http://localhost:4318/v1/traces
  headers: {
    foo: 'bar'
  }, //an optional object containing custom headers to be sent with each request will only work with http
};

const exporter = new OTLPTraceExporter(collectorOptions);
const provider = new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(exporter)]
});

provider.register();

```

## Exporter Timeout Configuration

The OTLPTraceExporter has a timeout configuration option which is the maximum time, in milliseconds, the OTLP exporter will wait for each batch export. The default value is 10000ms.

To override the default timeout duration, use the following options:

- Set with environment variables:

  | Environment variable              | Description                                                                                                    |
  | --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
  | OTEL_EXPORTER_OTLP_TRACES_TIMEOUT | The maximum waiting time, in milliseconds, allowed to send each OTLP trace batch. Default is 10000.            |
  | OTEL_EXPORTER_OTLP_TIMEOUT        | The maximum waiting time, in milliseconds, allowed to send each OTLP trace and metric batch. Default is 10000. |

  > `OTEL_EXPORTER_OTLP_TRACES_TIMEOUT` takes precedence and overrides `OTEL_EXPORTER_OTLP_TIMEOUT`.

- Provide `timeoutMillis` to OTLPTraceExporter with `collectorOptions`:

  ```js
  const collectorOptions = {
    timeoutMillis: 15000,
    url: '<opentelemetry-collector-url>', // url is optional and can be omitted - default is http://localhost:4318/v1/traces
    headers: {
      foo: 'bar'
    }, //an optional object containing custom headers to be sent with each request will only work with http
  };

  const exporter = new OTLPTraceExporter(collectorOptions);
  ```

  > Providing `timeoutMillis` with `collectorOptions` takes precedence and overrides timeout set with environment variables.

## OTLP Exporter Retry

OTLP requires that transient errors be handled with a [retry strategy](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/protocol/exporter.md#retry).

This retry policy has the following configuration, which there is currently no way to customize.

- `DEFAULT_EXPORT_MAX_ATTEMPTS`: The maximum number of attempts, including the original request. Defaults to 5.
- `DEFAULT_EXPORT_INITIAL_BACKOFF`: The initial backoff duration. Defaults to 1 second.
- `DEFAULT_EXPORT_MAX_BACKOFF`: The maximum backoff duration. Defaults to 5 seconds.
- `DEFAULT_EXPORT_BACKOFF_MULTIPLIER`: The backoff multiplier. Defaults to 1.5.

This retry policy first checks if the response has a `'Retry-After'` header. If there is a `'Retry-After'` header, the exporter will wait the amount specified in the `'Retry-After'` header before retrying. If there is no `'Retry-After'` header, the exporter will use an exponential backoff with jitter retry strategy.

  > The exporter will retry exporting within the [exporter timeout configuration](#exporter-timeout-configuration) time.

## Running opentelemetry-collector locally to see the traces

1. Go to examples/otlp-exporter-node
2. run `npm run docker:start`
3. Open page at `http://localhost:9411/zipkin/` to observe the traces

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/exporter-trace-otlp-proto
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Fexporter-trace-otlp-proto.svg
[semconv-resource-service-name]: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/resource/semantic_conventions/README.md#service
[metrics-exporter-url]: https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-exporter-metrics-otlp-proto
