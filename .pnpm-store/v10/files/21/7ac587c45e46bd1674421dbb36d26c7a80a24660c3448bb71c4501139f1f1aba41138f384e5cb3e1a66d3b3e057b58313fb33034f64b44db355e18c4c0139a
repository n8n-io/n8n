# OpenTelemetry async_hooks-based Context Managers

[![NPM Published Version][npm-img]][npm-url]
[![Apache License][license-image]][license-image]

This package provides two [`ContextManager`](https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api.ContextManager.html) implementations built on APIs from Node.js's [`async_hooks`][async-hooks-doc] module. If you're looking for a `ContextManager` to use in browser environments, consider [opentelemetry-context-zone](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-context-zone) or [opentelemetry-context-zone-peer-dep](https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-context-zone-peer-dep).

See [the definition of the `ContextManager` interface][def-context-manager] and the problem it solves.

## API

Two `ContextManager` implementations are exported:

- `AsyncLocalStorageContextManager`, based on [`AsyncLocalStorage`](https://nodejs.org/api/async_context.html#class-asynclocalstorage)
- `AsyncHooksContextManager`, based on [`AsyncHook`](https://nodejs.org/api/async_hooks.html#async_hooks_class_asynchook)

The former should be preferred over the latter as its implementation is substantially simpler than the latter's, and according to [Node.js docs](https://github.com/nodejs/node/blame/v17.1.0/doc/api/async_context.md#L42-L45),

> While you can create your own implementation [of `AsyncLocalStorage`] on top of [`AsyncHook`], `AsyncLocalStorage` should be preferred as it is a performant and memory safe implementation that involves significant optimizations that are non-obvious to implement.

`AsyncLocalStorage` is available in node `^12.17.0 || >= 13.10.0`, however `AsyncLocalStorageContextManager` is not enabled by default for node `<14.8.0` because of some important bugfixes which were introduced in `v14.8.0` (e.g., [nodejs/node#34573](https://github.com/nodejs/node/pull/34573)).

## Limitations

It's possible that this package won't track context perfectly when used with certain packages. In particular, it inherits any bugs present in async_hooks. See [the known issues][pkgs-that-break-ah].

async_hooks is still seeing significant correctness and performance fixes, it's recommended to run the latest Node.js LTS release to benefit from said fixes.

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
[async-hooks-doc]: http://nodejs.org/dist/latest/docs/api/async_hooks.html
[def-context-manager]: https://opentelemetry.io/docs/instrumentation/js/api/context/#context-manager
[dd-js-tracer-scope]: https://github.com/DataDog/dd-trace-js/blob/master/packages/dd-trace/src/scope.js
[opentracing-scope]: https://github.com/opentracing/opentracing-javascript/pull/113
[diag-team-scope-discussion]: https://github.com/nodejs/diagnostics/issues/300
[pkgs-that-break-ah]: https://github.com/nodejs/diagnostics/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc+label%3Aasync-continuity
[npm-url]: https://www.npmjs.com/package/@opentelemetry/context-async-hooks
[npm-img]: https://badge.fury.io/js/%40opentelemetry%2Fcontext-async-hooks.svg
