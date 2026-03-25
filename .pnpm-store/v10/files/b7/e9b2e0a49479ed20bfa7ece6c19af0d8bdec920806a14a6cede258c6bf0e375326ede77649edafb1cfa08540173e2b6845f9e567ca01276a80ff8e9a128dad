# Release History

## 1.0.1 (2022-05-05)

### Other Changes

- Minor improvements to the typing of `updatedOptions` when calling startSpan.

## 1.0.0 (2022-03-31)

This release marks the GA release of our @azure/core-tracing libraries and is unchanged from preview.14

## 1.0.0-preview.14 (2022-02-03)

### Breaking Changes

- @azure/core-tracing has been rewritten in order to provide cleaner abstractions for client libraries as well as remove @opentelemetry/api as a direct dependency.
  - @opentelemetry/api is no longer a direct dependency of @azure/core-tracing providing for smaller bundle sizes and lower incidence of version conflicts
  - `createSpanFunction` has been removed and replaced with a stateful `TracingClient` which can be created using the `createTracingClient` function.
  - `TracingClient` introduces a new API for creating tracing spans. Use `TracingClient#withSpan` to wrap an invocation in a span, ensuring the span is ended and exceptions are captured.
  - `TracingClient` also provides the lower-level APIs necessary to start a span without making it active, create request headers, serialize `traceparent` header, and wrapping a callback with an active context.

### Other Changes

- Updates package to work with the react native bundler. [PR #17783](https://github.com/Azure/azure-sdk-for-js/pull/17783)

## 1.0.0-preview.13 (2021-07-15)

### Features Added

- Added support for disabling distributed tracing using the AZURE_TRACING_DISABLED environment variable.

### Breaking Changes

- Removed `TestTracer` and `TestSpan` from public API and into `@azure/test-utils`. [PR #16315](https://github.com/Azure/azure-sdk-for-js/pull/16315)
  - `TestTracer` and `TestSpan` are intended for test support when used by other Azure packages and not intended for use by end users.
- Removed `setTracer`, @azure/core-tracing will now rely on the `trace` API to fetch a tracer from the global tracer provider. [PR #16347](https://github.com/Azure/azure-sdk-for-js/pull/16347)
  - If you are using `setTracer`, please use `trace.setGlobalTracerProvider(provider)` instead as described in the OpenTelemetry documentation.
- Removed `NoOpTracer` and `NoOpSpan` from the public API. Please use `trace.wrapSpanContext(INVALID_SPAN_CONTEXT)` from `@opentelemetry/api` instead. [PR #16315](https://github.com/Azure/azure-sdk-for-js/pull/16315)

## 1.0.0-preview.12 (2021-06-30)

- Update `@opentelemetry/api` to version 1.0.0 [PR #15883](https://github.com/Azure/azure-sdk-for-js/pull/15883)
  - This version ships with ESM modules and fixes an issue where Angular projects would warn ab out optimization bailouts due to dependencies on CommonJS or AMD.

### Breaking Changes

- Removed `OpenCensusSpanWrapper` and `OpenCensusTracerWrapper` from the public API. Customers using these wrappers should migrate to using `OpenTelemetry` directly. [PR #15770](https://github.com/Azure/azure-sdk-for-js/pull/15770)
- Update `@azure/core-tracing` to version 1.0.0-preview.12. This brings core-tracing up to date with `@opentelemetry/api@1.0.0`.
  - `Span#context` was renamed to `Span#spanContext`. This change is supported in `@azure/core-http@1.2.7`.

## 1.0.0-preview.11 (2021-03-30)

### Breaking Changes

- Update @azure/core-tracing to version 1.0.0-preview.11. This brings core-tracing up to date with @opentelemetry/api@1.0.0-rc.0.
  There are two scenarios that will require changes if you are using tracing:
  - Previously, you would pass a parent span using the `OperationOptions.tracingOptions.spanOptions.parentSpan` property. This has been
    changed so that you now specify a parent `Context` using the `OperationOptions.tracingOptions.tracingContext` property instead.
  - The status code for Spans is no longer of type `CanonicalCode`. Instead, it's now `SpanStatusCode`, which also has a smaller range of values.

## 1.0.0-preview.10 (2021-03-04)

- Internal improvements to make future opentelemetry updates simpler.

## 1.0.0-preview.9 (2020-08-04)

- Update `@opentelemetry/api` to version 0.10.2 [PR 10393](https://github.com/Azure/azure-sdk-for-js/pull/10393)

## 1.0.0-preview.8 (2020-04-28)

- Update `TestSpan` to allow setting span attributes [PR link](https://github.com/Azure/azure-sdk-for-js/pull/6565).
- [BREAKING] Migrate to OpenTelemetry 0.6 using the new `@opentelemetry/api` package. There were a few breaking changes:
  - `SpanContext` now requires traceFlags to be set.
  - `Tracer` has removed `recordSpanData`, `getBinaryFormat`, and `getHttpTextFormat`.
  - `Tracer.getCurrentSpan` returns `undefined` instead of `null` when unset.
  - `Link` objects renamed `spanContext` property to `context`.

## 1.0.0-preview.7 (2019-12-03)

- Updated the behavior of how incompatible versions of OpenTelemetry Tracer are handled. Now, errors will be thrown only if the user has manually set a Tracer. This means that incompatible versions will be silently ignored when tracing is not enabled.
- Updated to use OpenTelemetry 0.2 via the `@opentelemetry/types` package. There were two breaking changes in this update:
  - `isRecordingEvents` on `Span` was renamed to `isRecording`. [PR link](https://github.com/open-telemetry/opentelemetry-js/pull/454)
  - `addLink` was removed from `Span` as links are now only allowed to be added during span creation. This is possible by specifying any necessary links inside `SpanOptions`. [PR link](https://github.com/open-telemetry/opentelemetry-js/pull/449)

## 1.0.0-preview.5 (2019-10-22)

- Fixes issue where loading multiple copies of this module could result in the tracer set by `setTracer()` being reset.

## 1.0.0-preview.4 (2019-10-08)

- Remove dependency on the `debug` module to ensure compatibility with IE11

## 1.0.0-preview.3 (2019-10-07)

- Updated to use the latest types from OpenTelemetry (PR [#5182](https://github.com/Azure/azure-sdk-for-js/pull/5182))
- Clean up and refactored code for easier usage and testability. (PR [#5233](https://github.com/Azure/azure-sdk-for-js/pull/5233) and PR [#5283](https://github.com/Azure/azure-sdk-for-js/pull/5283))

## 1.0.0-preview.2 (2019-09-09)

Updated the `OpenCensusSpanPlugin` & the `NoOpSpanPlugin` to support for retrieving span context. This allows updating of request headers with the right [span context](https://www.w3.org/TR/trace-context/#trace-context-http-headers-format). (PR [#4712](https://github.com/Azure/azure-sdk-for-js/pull/4712))

## 1.0.0-preview.1 (2019-08-05)

Provides low-level interfaces and helper methods for tracing in Azure SDK
