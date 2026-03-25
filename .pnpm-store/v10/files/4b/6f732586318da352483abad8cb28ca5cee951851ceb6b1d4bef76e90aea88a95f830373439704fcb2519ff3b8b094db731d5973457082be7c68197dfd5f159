# OpenTelemetry Zipkin Trace Exporter

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

OpenTelemetry Zipkin Trace Exporter allows the user to send collected traces to Zipkin.

[Zipkin](https://zipkin.io/) is a distributed tracing system. It helps gather timing data needed to troubleshoot latency problems in microservice architectures. It manages both the collection and lookup of this data.

## Installation

```bash
npm install --save @opentelemetry/exporter-zipkin
```

## Usage in Node and Browser

Install the exporter on your application and pass the options. `serviceName` is an optional string. If omitted, the exporter will first try to get the service name from the Resource. If no service name can be detected on the Resource, a fallback name of "OpenTelemetry Service" will be used.

```js
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');

// Add your zipkin url (`http://localhost:9411/api/v2/spans` is used as
// default) and application name to the Zipkin options.
// You can also define your custom headers which will be added automatically.
const options = {
  headers: {
    'my-header': 'header-value',
  },
  url: 'your-zipkin-url',
  // optional interceptor
  getExportRequestHeaders: () => {
    return {
      'my-header': 'header-value',
    }
  }
}
const exporter = new ZipkinExporter(options);
```

Now, register the exporter and start tracing.

```js
const tracerProvider = new NodeTracerProvider({
  spanProcessors: [new BatchSpanProcessor(exporter)]
})

const tracer = traceProvider.getTracer('my-tracer')
```

You can use built-in `SimpleSpanProcessor` or `BatchSpanProcessor` or write your own.

- [SimpleSpanProcessor](https://github.com/open-telemetry/opentelemetry-specification/blob/master/specification/trace/sdk.md#simple-processor): The implementation of `SpanProcessor` that passes ended span directly to the configured `SpanExporter`.
- [BatchSpanProcessor](https://github.com/open-telemetry/opentelemetry-specification/blob/master/specification/trace/sdk.md#batching-processor): The implementation of the `SpanProcessor` that batches ended spans and pushes them to the configured `SpanExporter`. It is recommended to use this `SpanProcessor` for better performance and optimization.

### Options

- **getExportRequestHeaders** - optional interceptor that allows adding new headers every time time the exporter is going to send spans.
This is optional and can be used if headers are changing over time. This is a sync callback.

## Viewing your traces

Please visit the Zipkin UI endpoint <http://localhost:9411>

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For Zipkin project at <https://zipkin.io/>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[npm-url]: https://www.npmjs.com/package/@opentelemetry/exporter-zipkin
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Fexporter-zipkin.svg
