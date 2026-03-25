# Azure Monitor OpenTelemetry Exporter client library for JavaScript

[![npm version](https://badge.fury.io/js/%40azure%2Fmonitor-opentelemetry-exporter.svg)](https://badge.fury.io/js/%40azure%2Fmonitor-opentelemetry-exporter)

## Getting started

This exporter package assumes your application is [already instrumented](https://opentelemetry.io/docs/languages/js/getting-started/) with the OpenTelemetry SDK. Once you are ready to export OpenTelemetry data, you can add this exporter to your application.

### Install the package

`npm install @azure/monitor-opentelemetry-exporter`

### Currently supported environments

- [LTS versions of Node.js](https://github.com/nodejs/release#release-schedule)

See our [support policy](https://github.com/Azure/azure-sdk-for-js/blob/main/SUPPORT.md) for more details.

> _Warning:_ This SDK only works for Node.js environments. Use the [Application Insights JavaScript SDK](https://github.com/microsoft/ApplicationInsights-JS) for browser environments.

### Prerequisites

- An [Azure subscription](https://azure.microsoft.com/free/)
- An [Application Insights workspace](https://learn.microsoft.com/azure/azure-monitor/app/app-insights-overview/)

### Distributed Tracing

Add the exporter to your existing OpenTelemetry Tracer Provider (`NodeTracerProvider` / `BasicTracerProvider`)

```ts snippet:ReadmeSampleDistributedTracing
import { AzureMonitorTraceExporter } from "@azure/monitor-opentelemetry-exporter";
import { NodeTracerProvider, BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

// Create an exporter instance
const exporter = new AzureMonitorTraceExporter({
  connectionString: "<connection string>",
});

// Create and configure the Node Tracer provider
const tracerProvider = new NodeTracerProvider({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "basic-service",
  }),
  spanProcessors: [
    new BatchSpanProcessor(exporter, {
      exportTimeoutMillis: 15000,
      maxQueueSize: 1000,
    }),
  ],
});

// Register Tracer Provider as global
tracerProvider.register();
```

### Metrics

Add the exporter to your existing OpenTelemetry Meter Provider (`MeterProvider`)

```ts snippet:ReadmeSampleMetrics
import { AzureMonitorMetricExporter } from "@azure/monitor-opentelemetry-exporter";
import { PeriodicExportingMetricReader, MeterProvider } from "@opentelemetry/sdk-metrics";
import { metrics } from "@opentelemetry/api";

// Add the exporter into the MetricReader and register it with the MeterProvider
const exporter = new AzureMonitorMetricExporter({
  connectionString: "<connection string>",
});

const metricReaderOptions = {
  exporter: exporter,
};
const metricReader = new PeriodicExportingMetricReader(metricReaderOptions);
const meterProvider = new MeterProvider({
  readers: [metricReader],
});

// Register Meter Provider as global
metrics.setGlobalMeterProvider(meterProvider);
```

### Logs

Add the Log Exporter to your existing OpenTelemetry Logger Provider (`LoggerProvider`)

```ts snippet:ReadmeSampleLogs
import { AzureMonitorLogExporter } from "@azure/monitor-opentelemetry-exporter";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { logs } from "@opentelemetry/api-logs";

// Add the Log exporter into the logRecordProcessor and register it with the LoggerProvider
const exporter = new AzureMonitorLogExporter({
  connectionString: "<connection string>",
});

const logRecordProcessor = new BatchLogRecordProcessor(exporter);
const loggerProvider = new LoggerProvider();
loggerProvider.addLogRecordProcessor(logRecordProcessor);

// Register logger Provider as global
logs.setGlobalLoggerProvider(loggerProvider);
```

### Sampling

You can enable sampling to limit the amount of telemetry records you receive. In order to enable correct sampling in Application Insights, use the `ApplicationInsightsSampler` as shown below.

```ts snippet:ReadmeSampleSampling
import { ApplicationInsightsSampler } from "@azure/monitor-opentelemetry-exporter";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

// Sampler expects a sample rate of between 0 and 1 inclusive
// A rate of 0.75 means approximately 75 % of your traces will be sent
const aiSampler = new ApplicationInsightsSampler(0.75);
const provider = new NodeTracerProvider({
  sampler: aiSampler,
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "basic-service",
  }),
});

provider.register();
```

## Examples

For complete samples of a few champion scenarios, see the [`samples/`](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/monitor/monitor-opentelemetry-exporter/samples/) folder.

## Key concepts

For more information on the OpenTelemetry project, please review the [**OpenTelemetry Specifications**](https://github.com/open-telemetry/opentelemetry-specification#opentelemetry-specification).

## Troubleshooting

### Enable debug logging

You can enable debug logging by changing the logging level of your provider.

```ts snippet:EnableDebugLogging
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";

const provider = new NodeTracerProvider();
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ALL);
provider.register();
```

### Logging

Enabling Azure logging may also help uncover useful information about failures. In order to see a log of HTTP requests and responses, set the `AZURE_LOG_LEVEL` environment variable to `info`. Alternatively, logging can be enabled at runtime by calling `setLogLevel` in the `@azure/logger`:

```ts snippet:SetLogLevel
import { setLogLevel } from "@azure/logger";

setLogLevel("info");
```

For more detailed instructions on how to enable logs, you can look at the [@azure/logger package docs](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/core/logger).

## Next steps

This exporter is made to be used with the [OpenTelemetry JS](https://github.com/open-telemetry/opentelemetry-js).

### Plugin Registry

To see if a plugin has already been made for a library you are using, please check out the [OpenTelemetry Registry](https://opentelemetry.io/registry/).

If you cannot your library in the registry, feel free to suggest a new plugin request at [`opentelemetry-js-contrib`](https://github.com/open-telemetry/opentelemetry-js-contrib).

## Contributing

If you'd like to contribute to this library, please read the [contributing guide](https://github.com/Azure/azure-sdk-for-js/blob/main/CONTRIBUTING.md) to learn more about how to build and test the code.
