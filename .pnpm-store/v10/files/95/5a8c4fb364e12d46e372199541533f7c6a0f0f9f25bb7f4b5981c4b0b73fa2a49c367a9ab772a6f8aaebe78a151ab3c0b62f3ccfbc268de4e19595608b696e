# OpenTelemetry async_hooks-based Context Managers

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This package provides two [`ContextManager`](https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api.ContextManager.html) implementations built on APIs from Node.js's [`async_hooks`][async-hooks-doc] module. If you're looking for a `ContextManager` to use in browser environments, consider [opentelemetry-context-zone](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-context-zone) or [opentelemetry-context-zone-peer-dep](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-context-zone-peer-dep).

See [the definition of the `ContextManager` interface][def-context-manager] and the problem it solves.

## API

Two `ContextManager` implementations are exported:

- `AsyncLocalStorageContextManager`, based on [`AsyncLocalStorage`](https://nodejs.org/api/async_context.html#class-asynclocalstorage)
- `AsyncHooksContextManager`, based on [`AsyncHook`](https://nodejs.org/api/async_hooks.html#async_hooks_class_asynchook). This is **deprecated** and will be removed in v3 (planned for mid-2025. `AsyncLocalStorage` is simpler, faster, available in Node.js v14.8.0 and later, and avoids [this possible DoS vulnerability](https://nodejs.org/en/blog/vulnerability/january-2026-dos-mitigation-async-hooks).

## Prior art

Context propagation is a big subject when talking about tracing in Node.js. If you want more information about it here are some resources:

- <https://www.npmjs.com/package/continuation-local-storage> (which was the old way of doing context propagation)
- [Datadog's own implementation][dd-js-tracer-scope] for their JavaScript tracer
- [OpenTracing implementation][opentracing-scope]
- [Discussion about context propagation][diag-team-scope-discussion] by the Node.js Diagnostics Working Group

## Useful links

- For more information on OpenTelemetry, visit: <https://opentelemetry.io/>
- For more about OpenTelemetry JavaScript: <https://github.com/open-telemetry/opentelemetry-js>
- For help or feedback on this project, join us in [GitHub Discussions][discussions-url]

## License

Apache 2.0 - See [LICENSE][license-url] for more information.

[discussions-url]: https://github.com/open-telemetry/opentelemetry-js/discussions
[license-url]: https://github.com/open-telemetry/opentelemetry-js/blob/main/LICENSE
[license-image]: https://img.shields.io/badge/license-Apache_2.0-green.svg?style=flat
[def-context-manager]: https://opentelemetry.io/docs/instrumentation/js/api/context/#context-manager
[dd-js-tracer-scope]: https://github.com/DataDog/dd-trace-js/blob/master/packages/dd-trace/src/scope.js
[opentracing-scope]: https://github.com/opentracing/opentracing-javascript/pull/113
[diag-team-scope-discussion]: https://github.com/nodejs/diagnostics/issues/300
[npm-url]: https://www.npmjs.com/package/@opentelemetry/context-async-hooks
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Fcontext-async-hooks.svg
