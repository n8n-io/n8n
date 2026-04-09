# OpenTelemetry Protocol

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

**Note: This package is intended for internal use only.**

**Note: This is an experimental package under active development. New releases may include breaking changes.**

This package provides everything needed to serialize [OpenTelemetry SDK][sdk] traces, metrics and logs into the [OpenTelemetry Protocol][otlp] format.

## Quick Start

To get started you will need to install a compatible OpenTelemetry API.

### Install Peer Dependencies

```sh
npm install @opentelemetry/api
```

### Serialize Traces/Metrics/Logs

This module exports functions to serialize traces, metrics and logs from the OpenTelemetry SDK into protocol buffers which can be sent over HTTP to the OpenTelemetry collector or a compatible receiver.

```typescript
import {
  createExportTraceServiceRequest,
  createExportMetricsServiceRequest,
  createExportLogsServiceRequest,
} from '@opentelemetry/otlp-transformer';

const serializedSpans = createExportTraceServiceRequest(readableSpans);
const serializedMetrics = createExportMetricsServiceRequest(readableMetrics);
const serializedLogs = createExportLogsServiceRequest(readableLogRecords);
```

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/otlp-transformer
[npm-img]: https://badge.fury.io/js/%40opentelemetry%otlp-transformer.svg

[sdk]: https://github.com/open-telemetry/opentelemetry-js
[otlp]: https://github.com/open-telemetry/opentelemetry-proto
