# OpenTelemetry Collector Logs Exporter for web and node with HTTP

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

**Note: This is an experimental package under active development. New releases may include breaking changes.**

This module provides a logs-exporter for OTLP (http/json) using protocol version `v1.7.0`.

## Installation

```bash
npm install --save @opentelemetry/exporter-logs-otlp-http
```

## Further Documentation

To see documentation and sample code for the traces exporter, as well as instructions for using TLS, visit the [Collector Trace Exporter for web and node][trace-exporter-url].
To see documentation and sample code for the metric exporter, see the [exporter-metrics-otlp-grpc package][metrics-exporter-url]

## Logs in Web

The OTLPLogExporter in Web expects the endpoint to end in `/v1/logs`.

```js
import { SeverityNumber } from '@opentelemetry/api-logs';
import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';

// exporter options. see all options in OTLPExporterConfigBase
const collectorOptions = {
  url: '<opentelemetry-collector-url>', // url is optional and can be omitted - default is http://localhost:4318/v1/logs
  headers: {}, // an optional object containing custom headers to be sent with each request
  concurrencyLimit: 1, // an optional limit on pending requests
};
const logExporter = new OTLPLogExporter(collectorOptions);
const loggerProvider = new LoggerProvider({
  processors: [new BatchRecordProcessor(logExporter)]
});

const logger = loggerProvider.getLogger('default', '1.0.0');
// Emit a log
logger.emit({
  severityNumber: SeverityNumber.INFO,
  severityText: 'info',
  body: 'this is a log body',
  attributes: { 'log.type': 'custom' },
});
```

## Logs in Node

```js
import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';

// exporter options. see all options in OTLPExporterNodeConfigBase
const collectorOptions = {
  url: '<opentelemetry-collector-url>', // url is optional and can be omitted - default is http://localhost:4318/v1/logs
  concurrencyLimit: 1, // an optional limit on pending requests
};
const logExporter = new OTLPLogExporter(collectorOptions);
const loggerProvider = new LoggerProvider({
  processors: [new BatchRecordProcessor(logExporter)]
});

const logger = loggerProvider.getLogger('default', '1.0.0');
// Emit a log
logger.emit({
  severityNumber: SeverityNumber.INFO,
  severityText: 'info',
  body: 'this is a log body',
  attributes: { 'log.type': 'custom' },
});
```

## Environment Variable Configuration

In addition to settings passed to the constructor, the exporter also supports configuration via environment variables:

| Environment variable             | Description                                                                                                                                                                                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OTEL_EXPORTER_OTLP_ENDPOINT      | The endpoint to send logs to. This will also be used for the traces exporter if `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` is not configured. By default `http://localhost:4318` will be used. `/v1/logs` will be automatically appended to configured values. |
| OTEL_EXPORTER_OTLP_LOGS_ENDPOINT | The endpoint to send logs to. By default `https://localhost:4318/v1/logs` will be used. `v1/logs` will not be appended automatically and has to be added explicitly.                                                                                     |
| OTEL_EXPORTER_OTLP_LOGS_TIMEOUT  | The maximum waiting time, in milliseconds, allowed to send each OTLP log batch. Default is 10000.                                                                                                                                                        |
| OTEL_EXPORTER_OTLP_TIMEOUT       | The maximum waiting time, in milliseconds, allowed to send each OTLP trace/metric/log batch. Default is 10000.                                                                                                                                           |

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
[npm-url]: https://www.npmjs.com/package/@opentelemetry/exporter-logs-otlp-http
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Fexporter-logs-otlp-http.svg
[trace-exporter-url]: https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/exporter-trace-otlp-http
[metrics-exporter-url]: https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-exporter-metrics-otlp-http
