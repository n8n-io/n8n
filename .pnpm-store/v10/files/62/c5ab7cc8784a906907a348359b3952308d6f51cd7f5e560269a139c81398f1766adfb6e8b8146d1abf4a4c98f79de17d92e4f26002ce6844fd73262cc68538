# OpenTelemetry Logs SDK

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

**Note: This is an experimental package under active development. New releases may include breaking changes.**

OpenTelemetry logs module contains the foundation for all logs SDKs of [opentelemetry-js](https://github.com/open-telemetry/opentelemetry-js).

Used standalone, this module provides methods for manual instrumentation of code, offering full control over recording logs for client-side JavaScript (browser) and Node.js.

It does **not** provide automated instrumentation of known libraries or host environment logs out-of-the-box.

## Installation

```bash
npm install --save @opentelemetry/api-logs
npm install --save @opentelemetry/sdk-logs
```

## Usage

The basic setup of the SDK can be seen as followings:

```js
const logsAPI = require('@opentelemetry/api-logs');
const {
  LoggerProvider,
  SimpleLogRecordProcessor,
  ConsoleLogRecordExporter,
} = require('@opentelemetry/sdk-logs');

// To start a logger, you first need to initialize the Logger provider.
// and add a processor to export log record
const loggerProvider = new LoggerProvider({
  processors: [new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())]
});

//  To create a log record, you first need to get a Logger instance
const logger = loggerProvider.getLogger('default');

// You can also use global singleton
logsAPI.logs.setGlobalLoggerProvider(loggerProvider);
const logger = logsAPI.logs.getLogger('default');

// emit a log record
logger.emit({
  severityNumber: logsAPI.SeverityNumber.INFO,
  severityText: 'INFO',
  body: 'this is a log record body',
  attributes: { 'log.type': 'LogRecord' },
});
```

## Config

Logs configuration is a merge of both the user supplied configuration and the default
configuration as specified in [config.ts](./src/config.ts)

## Logger Configuration

The SDK supports advanced logger configuration through the `LoggerConfigurator` API, which allows you to:

- **Filter logs by minimum severity level** - Drop logs below a configured severity threshold
- **Filter logs by trace sampling status** - Drop logs associated with unsampled traces
- **Configure per-logger patterns** - Apply different configurations to different loggers using wildcard patterns

### Minimum Severity Filtering

Filter logs based on their severity level. Logs with severity below the configured minimum will be dropped before reaching the processor/exporter.

```js
const { LoggerProvider, createLoggerConfigurator } = require('@opentelemetry/sdk-logs');
const { SeverityNumber } = require('@opentelemetry/api-logs');

const loggerProvider = new LoggerProvider({
  loggerConfigurator: createLoggerConfigurator([
    {
      pattern: '*', // Match all loggers
      config: {
        minimumSeverity: SeverityNumber.WARN // Only WARN, ERROR, and FATAL logs
      }
    }
  ]),
  processors: [new SimpleLogRecordProcessor(exporter)]
});
```

**Behavior:**

- Logs with `severityNumber >= minimumSeverity` are exported
- Logs with `severityNumber = UNSPECIFIED` (0) or undefined always bypass the filter
- Default minimum severity is `UNSPECIFIED` (no filtering)

### Trace-Based Filtering

Filter logs based on their associated trace's sampling status. Logs from unsampled traces can be dropped to reduce volume while keeping sampled trace logs.

```js
const loggerProvider = new LoggerProvider({
  loggerConfigurator: createLoggerConfigurator([
    {
      pattern: '*',
      config: {
        traceBased: true // Drop logs from unsampled traces
      }
    }
  ]),
  processors: [new SimpleLogRecordProcessor(exporter)]
});
```

**Behavior:**

- Logs associated with **sampled traces** (TraceFlags.SAMPLED set) are exported
- Logs associated with **unsampled traces** (TraceFlags.SAMPLED not set) are dropped
- Logs **without trace context** bypass the filter and are exported
- Default is `false` (no trace-based filtering)

### Combined Filtering

Both filters can be combined. A log must pass **both** filters to be exported.

```js
const loggerProvider = new LoggerProvider({
  loggerConfigurator: createLoggerConfigurator([
    {
      pattern: '*',
      config: {
        minimumSeverity: SeverityNumber.WARN, // Filter by severity
        traceBased: true // AND filter by trace sampling
      }
    }
  ]),
  processors: [new SimpleLogRecordProcessor(exporter)]
});
```

### Per-Logger Configuration

Use pattern matching to configure different loggers differently. Patterns are matched in order, and the first match is used.

```js
const loggerProvider = new LoggerProvider({
  loggerConfigurator: createLoggerConfigurator([
    {
      pattern: 'critical-service', // Exact match
      config: { minimumSeverity: SeverityNumber.ERROR }
    },
    {
      pattern: 'debug-*', // Wildcard match
      config: { minimumSeverity: SeverityNumber.DEBUG }
    },
    {
      pattern: '*', // Default for all other loggers
      config: { minimumSeverity: SeverityNumber.WARN }
    }
  ])
});

// Different loggers get different configurations
const criticalLogger = loggerProvider.getLogger('critical-service'); // ERROR+
const debugLogger = loggerProvider.getLogger('debug-api'); // DEBUG+
const defaultLogger = loggerProvider.getLogger('my-service'); // WARN+
```

### Configuration Options

```typescript
interface LoggerConfig {
  /** Drop logs with severity below this level (default: UNSPECIFIED = no filtering) */
  minimumSeverity?: SeverityNumber;
  
  /** Drop logs from unsampled traces (default: false) */
  traceBased?: boolean;
  
  /** Disable this logger completely (default: false) */
  disabled?: boolean;
}
```

## Example

See [examples/logs](https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/examples/logs)

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/sdk-logs
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Fsdk%2Dlogs.svg
