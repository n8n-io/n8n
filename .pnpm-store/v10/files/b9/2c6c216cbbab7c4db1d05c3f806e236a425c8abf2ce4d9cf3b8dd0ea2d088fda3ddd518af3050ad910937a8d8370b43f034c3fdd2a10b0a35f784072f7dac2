# OpenTelemetry Collector Exporter for web and node

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

**Note: This is an experimental package under active development. New releases may include breaking changes.**

This module provides a trace-exporter for OTLP (http/json) using protocol version `v0.20.0`.

## Installation

```bash
npm install --save @opentelemetry/exporter-trace-otlp-http
```

## Service Name

The OpenTelemetry Collector Exporter does not have a service name configuration.
In order to set the service name, use the `service.name` resource attribute as prescribed in the [OpenTelemetry Resource Semantic Conventions][semconv-resource-service-name].
To see documentation and sample code for the metric exporter, see the [exporter-metrics-otlp-http package][metrics-exporter-url]

## Traces in Web

The OTLPTraceExporter in Web expects the endpoint to end in `/v1/traces`.

```js
import {
  BatchSpanProcessor,
  WebTracerProvider,
} from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const collectorOptions = {
  url: '<opentelemetry-collector-url>', // url is optional and can be omitted - default is http://localhost:4318/v1/traces
  headers: {}, // an optional object containing custom headers to be sent with each request
  concurrencyLimit: 10, // an optional limit on pending requests
};

const provider = new WebTracerProvider();
const exporter = new OTLPTraceExporter(collectorOptions);
provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
  // The maximum queue size. After the size is reached spans are dropped.
  maxQueueSize: 100,
  // The maximum batch size of every export. It must be smaller or equal to maxQueueSize.
  maxExportBatchSize: 10,
  // The interval between two consecutive exports
  scheduledDelayMillis: 500,
  // How long the export can run before it is cancelled
  exportTimeoutMillis: 30000,
}));

provider.register();

```

## Traces in Node - JSON over http

```js
const { BasicTracerProvider, BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter } =  require('@opentelemetry/exporter-trace-otlp-http');

const collectorOptions = {
  url: '<opentelemetry-collector-url>', // url is optional and can be omitted - default is http://localhost:4318/v1/traces
  headers: {
    foo: 'bar'
  }, // an optional object containing custom headers to be sent with each request will only work with http
  concurrencyLimit: 10, // an optional limit on pending requests
};

const provider = new BasicTracerProvider();
const exporter = new OTLPTraceExporter(collectorOptions);
provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
  // The maximum queue size. After the size is reached spans are dropped.
  maxQueueSize: 1000,
  // The interval between two consecutive exports
  scheduledDelayMillis: 30000,
}));

provider.register();

```

## GRPC

For GRPC please check [npm-url-grpc]

## PROTOBUF

For PROTOBUF please check [npm-url-proto]

## Configuration options as environment variables

Instead of providing options to `OTLPTraceExporter` explicitly, environment variables may be provided instead.

```sh
OTEL_EXPORTER_OTLP_ENDPOINT=https://localhost:4318
# this will automatically append the version and signal path
# e.g. https://localhost:4318/v1/traces for `OTLPTraceExporter` and https://localhost:4318/v1/metrics for `OTLPMetricExporter`
```

If the trace and metric exporter endpoints have different providers, the env var for per-signal endpoints are available to use

```sh
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://trace-service:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://metric-service:4318/v1/metrics
# version and signal needs to be explicit
```

> The per-signal endpoints take precedence and overrides `OTEL_EXPORTER_OTLP_ENDPOINT`

For more details, see [OpenTelemetry Specification on Protocol Exporter][opentelemetry-spec-protocol-exporter].

## Exporter Timeout Configuration

The OTLPTraceExporter has a timeout configuration option which is the maximum time, in milliseconds, the OTLP exporter will wait for each batch export. The default value is 10000ms.

To override the default timeout duration, use the following options:

- Set with environment variables:

  | Environment variable | Description |
  |----------------------|-------------|
  | OTEL_EXPORTER_OTLP_TRACES_TIMEOUT | The maximum waiting time, in milliseconds, allowed to send each OTLP trace batch. Default is 10000. |
  | OTEL_EXPORTER_OTLP_TIMEOUT | The maximum waiting time, in milliseconds, allowed to send each OTLP trace and metric batch. Default is 10000. |

  > `OTEL_EXPORTER_OTLP_TRACES_TIMEOUT` takes precedence and overrides `OTEL_EXPORTER_OTLP_TIMEOUT`.

- Provide `timeoutMillis` to OTLPTraceExporter with `collectorOptions`:

  ```js
  const collectorOptions = {
    timeoutMillis: 15000,
    url: '<opentelemetry-collector-url>', // url is optional and can be omitted - default is http://localhost:4318/v1/traces
    headers: {
      foo: 'bar'
    }, // an optional object containing custom headers to be sent with each request will only work with http
    concurrencyLimit: 10, // an optional limit on pending requests
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

1. Go to `examples/otlp-exporter-node`
2. Follow the instructions there to inspect traces.

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/exporter-trace-otlp-http
[npm-url-grpc]: https://www.npmjs.com/package/@opentelemetry/exporter-trace-otlp-grpc
[npm-url-proto]: https://www.npmjs.com/package/@opentelemetry/exporter-trace-otlp-proto
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Fexporter-trace-otlp-http.svg
[opentelemetry-spec-protocol-exporter]: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/protocol/exporter.md#configuration-options
[semconv-resource-service-name]: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/resource/semantic_conventions/README.md#service
[metrics-exporter-url]: https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-exporter-metrics-otlp-http
