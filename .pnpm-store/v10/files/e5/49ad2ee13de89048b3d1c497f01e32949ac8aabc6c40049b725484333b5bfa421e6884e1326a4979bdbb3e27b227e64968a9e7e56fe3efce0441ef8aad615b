# OpenTelemetry Collector Logs Exporter for node with grpc

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

**Note: This is an experimental package under active development. New releases may include breaking changes.**

This module provides a logs-exporter for OTLP (gRPC) using protocol version `v1.7.0`.

## Installation

```bash
npm install --save @opentelemetry/exporter-logs-otlp-grpc
```

## Service Name

The OpenTelemetry Collector Exporter does not have a service name configuration.
In order to set the service name, use the `service.name` resource attribute as prescribed in the [OpenTelemetry Resource Semantic Conventions][semconv-resource-service-name].
To see documentation and sample code for the traces exporter, as well as instructions for using TLS, visit the [Collector Trace Exporter for web and node][trace-exporter-url].
To see documentation and sample code for the metric exporter, see the [exporter-metrics-otlp-grpc package][metrics-exporter-url]

## Logs in Node - GRPC

The OTLPLogExporter in Node expects the URL to only be the hostname. It will not work with `/v1/logs`. All
options that work with trace also work with logs.

```js
import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';

const collectorOptions = {
  // url is optional and can be omitted - default is http://localhost:4317
  // Unix domain sockets are also supported: 'unix:///path/to/socket.sock'
  url: 'http://<collector-hostname>:<port>',
};

const loggerExporter = new OTLPLogExporter(collectorOptions);
const loggerProvider = new LoggerProvider({
  processors: [new BatchRecordProcessor(loggerExporter)]
});

['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => loggerProvider.shutdown().catch(console.error));
});

// logging
const logger = loggerProvider.getLogger('example-logger');
logger.emit({ body: 'example-log' });
```

## Environment Variable Configuration

| Environment variable                  | Description                                                                                                                                                                                                                                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OTEL_EXPORTER_OTLP_LOGS_ENDPOINT      | The endpoint to send logs to. By default `localhost:4317` will be used.                                                                                                                                                                                                                                                |
| OTEL_EXPORTER_OTLP_ENDPOINT           | The endpoint to send trace, metric, and logs to. By default `localhost:4317` will be used.                                                                                                                                                                                                                             |
| OTEL_EXPORTER_OTLP_COMPRESSION        | The compression type to use on OTLP trace, metric, and log requests. Options include gzip. By default no compression will be used.                                                                                                                                                                                     |
| OTEL_EXPORTER_OTLP_INSECURE           | Whether to enable client transport security for the exporter's gRPC connection for trace, metric and log requests. This option only applies to OTLP/gRPC when an endpoint is provided without the http or https scheme. Options include true or false. By default insecure is false which creates a secure connection. |
| OTEL_EXPORTER_OTLP_CERTIFICATE        | The path to the file containing trusted root certificate to use when verifying an OTLP trace, metric, or log server's TLS credentials. By default the host platform's trusted root certificate is used.                                                                                                                |
| OTEL_EXPORTER_OTLP_CLIENT_KEY         | The path to the file containing private client key to use when verifying an OTLP trace, metric or log client's TLS credentials. Must provide a client certificate/chain when providing a private client key. By default no client key file is used.                                                                    |
| OTEL_EXPORTER_OTLP_CLIENT_CERTIFICATE | The path to the file containing trusted client certificate/chain for clients private key to use when verifying an OTLP trace, metric and log server's TLS credentials. Must provide a private client key when providing a certificate/chain. By default no chain file is used.                                         |
| OTEL_EXPORTER_OTLP_TIMEOUT            | The maximum waiting time, in milliseconds, allowed to send each OTLP trace and metric batch. Default is 10000.                                                                                                                                                                                                         |

> Settings configured programmatically take precedence over environment variables. Per-signal environment variables take precedence over non-per-signal environment variables.

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/exporter-logs-otlp-grpc
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Fexporter-logs-otlp-grpc.svg
[semconv-resource-service-name]: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/resource/semantic_conventions/README.md#service
[trace-exporter-url]: https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/exporter-trace-otlp-grpc
[metrics-exporter-url]: https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-exporter-metrics-otlp-grpc
