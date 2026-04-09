# OpenTelemetry Collector Metrics Exporter for node with grpc

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

**Note: This is an experimental package under active development. New releases may include breaking changes.**

This module provides a metrics-exporter for OTLP (gRPC) using protocol version `v1.7.0`.

## Installation

```bash
npm install --save @opentelemetry/exporter-metrics-otlp-grpc
```

## Service Name

The OpenTelemetry Collector Exporter does not have a service name configuration.
In order to set the service name, use the `service.name` resource attribute as prescribed in
the [OpenTelemetry Resource Semantic Conventions][semconv-resource-service-name].
To see sample code and documentation for the traces exporter, as well as instructions for using TLS, visit
the [Collector Trace Exporter for web and node][trace-exporter-url].

## Metrics in Node - GRPC

The OTLPMetricsExporter in Node expects the URL to only be the hostname. It will not work with `/v1/metrics`. All
options that work with trace also work with metrics.

```js
const { MeterProvider, PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc');
const collectorOptions = {
  // url is optional and can be omitted - default is http://localhost:4317
  // Unix domain sockets are also supported: 'unix:///path/to/socket.sock'
  url: 'http://<collector-hostname>:<port>',
};

const metricExporter = new OTLPMetricExporter(collectorOptions);
const meterProvider = new MeterProvider({
  readers: [
    new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 1000,
    }),
  ],
});

['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => meterProvider.shutdown().catch(console.error));
});

// Now, start recording data
const meter = meterProvider.getMeter('example-meter');
const counter = meter.createCounter('metric_name');
counter.add(10, { 'key': 'value' });
```

## Environment Variable Configuration

In addition to settings passed to the constructor, the exporter also supports configuration via environment variables:

| Environment variable                              | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OTEL_EXPORTER_OTLP_ENDPOINT                       | The endpoint to send metrics to. This will also be used for the traces exporter if `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` is not configured. By default `localhost:4317` will be used.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| OTEL_EXPORTER_OTLP_METRICS_ENDPOINT               | The endpoint to send metrics to. By default `localhost:4317` will be used.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| OTEL_EXPORTER_OTLP_COMPRESSION                    | The compression type to use on OTLP trace, metric, and log requests. Options include gzip. By default no compression will be used.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| OTEL_EXPORTER_OTLP_METRICS_INSECURE               | Whether to enable client transport security for the exporter's gRPC connection for metric requests. This option only applies to OTLP/gRPC when an endpoint is provided without the http or https scheme. Options include true or false. By default insecure is false which creates a secure connection.                                                                                                                                                                                                                                                                                                                                                                                  |
| OTEL_EXPORTER_OTLP_INSECURE                       | Whether to enable client transport security for the exporter's gRPC connection for trace, metric and log requests. This option only applies to OTLP/gRPC when an endpoint is provided without the http or https scheme. Options include true or false. By default insecure is false which creates a secure connection.                                                                                                                                                                                                                                                                                                                                                                   |
| OTEL_EXPORTER_OTLP_METRICS_CERTIFICATE            | The path to the file containing trusted root certificate to use when verifying an OTLP metric server's TLS credentials. By default the host platform's trusted root certificate is used.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| OTEL_EXPORTER_OTLP_CERTIFICATE                    | The path to the file containing trusted root certificate to use when verifying an OTLP trace, metric, or log server's TLS credentials. By default the host platform's trusted root certificate is used.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| OTEL_EXPORTER_OTLP_METRICS_CLIENT_KEY             | The path to the file containing private client key to use when verifying an OTLP metric client's TLS credentials. Must provide a client certificate/chain when providing a private client key. By default no client key file is used.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| OTEL_EXPORTER_OTLP_CLIENT_KEY                     | The path to the file containing private client key to use when verifying an OTLP trace, metric or log client's TLS credentials. Must provide a client certificate/chain when providing a private client key. By default no client key file is used.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| OTEL_EXPORTER_OTLP_METRICS_CLIENT_CERTIFICATE     | The path to the file containing trusted client certificate/chain for clients private key to use when verifying an OTLP metric server's TLS credentials. Must provide a private client key when providing a certificate/chain. By default no chain file is used.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE             | The path to the file containing trusted client certificate/chain for clients private key to use when verifying an OTLP trace, metric and log server's TLS credentials. Must provide a private client key when providing a certificate/chain. By default no chain file is used.                                                                                                                                                                                                                                                                                                                                                                                                           |
| OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE | The exporters aggregation temporality preference. Valid values are `cumulative`, `delta`, and `lowmemory`. `cumulative` selects cumulative temporality for all instrument kinds. `delta` selects delta aggregation temporality for Counter, Asynchronous Counter and Histogram instrument kinds, and selects cumulative aggregation for UpDownCounter and Asynchronous UpDownCounter instrument kinds. `lowmemory` select delta aggregation temporality for Synchronous Counter and Histogram instrument kinds, and selects cumulative aggregation for Synchronous UpDownCounter, Asynchronous Counter and Asynchronous UpDownCounter instrument kinds. By default `cumulative` is used. |

> Settings configured programmatically take precedence over environment variables. Per-signal environment variables take precedence over non-per-signal environment variables.

## Running opentelemetry-collector locally to see the metrics

1. Go to `examples/otlp-exporter-node`
2. Follow the instructions there to observe the metrics.

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/exporter-metrics-otlp-grpc
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Fexporter-metrics-otlp-grpc.svg
[semconv-resource-service-name]: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/resource/semantic_conventions/README.md#service
[trace-exporter-url]: https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/exporter-trace-otlp-grpc
