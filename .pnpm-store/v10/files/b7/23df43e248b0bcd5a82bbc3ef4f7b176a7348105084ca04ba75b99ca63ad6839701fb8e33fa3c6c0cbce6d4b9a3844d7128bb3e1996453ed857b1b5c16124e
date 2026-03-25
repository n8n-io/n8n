# Azure Core tracing library for JavaScript

This is the core tracing library that provides low-level interfaces and helper methods for tracing in Azure SDK JavaScript libraries which work in the browser and Node.js.

## Getting started

### Installation

This package is primarily used in Azure client libraries and not meant to be used directly by consumers of Azure SDKs.

## Key Concepts

- `TracingClient` is the primary interface providing tracing functionality to client libraries. Client libraries should only be aware of and interact with a `TracingClient` instance.
  - A `TracingClient` implementation can be created using the `createTracingClient` factory function.
- `Instrumenter` provides an abstraction over an instrumentation and acts as the interop point for using third party libraries like OpenTelemetry. By default, a no-op `Instrumenter` is used. Customers who wish to enable `OpenTelemetry` based tracing will do so by installing and registering the [@azure/opentelemetry-instrumentation-azure-sdk] package.
- `TracingContext` is an **immutable** data container, used to pass operation-specific information around (such as span parenting information).
- `TracingSpan` is an abstraction of a `Span` which can be used to record events, attributes, and exceptions.

## Examples

Examples can be found in the `samples` folder.

## Next steps

You can build and run the tests locally by executing `rushx test`. Explore the `test` folder to see advanced usage and behavior of the public classes.

## Troubleshooting

If you run into issues while using this library, please feel free to [file an issue](https://github.com/Azure/azure-sdk-for-js/issues/new).

## Contributing

If you'd like to contribute to this library, please read the [contributing guide](https://github.com/Azure/azure-sdk-for-js/blob/main/CONTRIBUTING.md) to learn more about how to build and test the code.

[@azure/opentelemetry-instrumentation-azure-sdk]: https://www.npmjs.com/package/@azure/opentelemetry-instrumentation-azure-sdk

![Impressions](https://azure-sdk-impressions.azurewebsites.net/api/impressions/azure-sdk-for-js%2Fsdk%2Fcore%2Fcore-tracing%2FREADME.png)
