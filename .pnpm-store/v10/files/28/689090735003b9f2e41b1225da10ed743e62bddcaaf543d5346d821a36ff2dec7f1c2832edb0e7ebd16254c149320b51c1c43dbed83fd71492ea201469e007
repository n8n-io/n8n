# SystemJS

[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/systemjs/systemjs?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Backers on Open Collective](https://opencollective.com/systemjs/backers/badge.svg)](#backers)
[![Sponsors on Open Collective](https://opencollective.com/systemjs/sponsors/badge.svg)](#sponsors)
[![Downloads on JS Delivr](https://data.jsdelivr.com/v1/package/npm/systemjs/badge)](https://www.jsdelivr.com/package/npm/systemjs)

SystemJS is a hookable, standards-based module loader. It provides a workflow where code written for production workflows of native ES modules in browsers ([like Rollup code-splitting builds](https://rollupjs.org/guide/en#code-splitting)), can be transpiled to the [System.register module format](docs/system-register.md) to work in older browsers that don't support native modules, running [almost-native module speeds](#performance) while supporting top-level await, dynamic import, circular references and live bindings, import.meta.url, module types, import maps, integrity and Content Security Policy with compatibility in older browsers back to IE11.

## Sponsors

<a href="https://opencollective.com/systemjs/sponsor/0/website" target="_blank"><img src="https://opencollective.com/systemjs/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/systemjs/sponsor/1/website" target="_blank"><img src="https://opencollective.com/systemjs/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/systemjs/sponsor/2/website" target="_blank"><img src="https://opencollective.com/systemjs/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/systemjs/sponsor/3/website" target="_blank"><img src="https://opencollective.com/systemjs/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/systemjs/sponsor/4/website" target="_blank"><img src="https://opencollective.com/systemjs/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/systemjs/sponsor/5/website" target="_blank"><img src="https://opencollective.com/systemjs/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/systemjs/sponsor/6/website" target="_blank"><img src="https://opencollective.com/systemjs/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/systemjs/sponsor/7/website" target="_blank"><img src="https://opencollective.com/systemjs/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/systemjs/sponsor/8/website" target="_blank"><img src="https://opencollective.com/systemjs/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/systemjs/sponsor/9/website" target="_blank"><img src="https://opencollective.com/systemjs/sponsor/9/avatar.svg"></a>

> **Support SystemJS by [becoming a sponsor](https://opencollective.com/systemjs#sponsor).** Your logo will show up here with a link to your website.

## Backers

Thank you to all our backers! 🙏 [[Become a backer](https://opencollective.com/systemjs#backer)]

<a href="https://opencollective.com/systemjs#backers" target="_blank"><img src="https://opencollective.com/systemjs/backers.svg?width=890"></a>

### Overview

#### 1. s.js minimal production loader

The minimal [2.8KB s.js production loader](dist/s.min.js) includes the following features:

* Loads `System.register` modules, the CSP-compatible [SystemJS module format](docs/system-register.md).
* Support for loading bare specifier names with [import maps](docs/import-maps.md) via `<script type="systemjs-importmap">`.
* Supports [hooks](docs/hooks.md) for loader customization.

#### 2. system.js loader

The [4.2KB system.js loader](dist/system.min.js) adds the following features in addition to the `s.js` features above:

* [Tracing hooks](docs/hooks.md##onloaderr-id-deps-iserrsource-sync) and [registry deletion API](docs/api.md#registry) for reloading workflows.
* Supports loading Wasm, CSS and JSON [module types](docs/module-types.md).
* Includes the [global loading extra](#extras) for loading global scripts, useful for loading library dependencies traditionally loaded with script tags.

#### 3. system-node.cjs loader

The [system-node.cjs](/dist/system-node.cjs) loader is a version of SystemJS build designed to run in Node.js, typically for workflows where System modules need to be executed on the server like SSR. It has the following features:

* Loading System modules from disk (via `file://` urls) or the network, with included caching that respects the Content-Type header.
* Import Maps (via the `applyImportMap` api).
* [Tracing hooks](docs/hooks.md#trace-hooks) and [registry deletion API](docs/api.md#registry) for reloading workflows.
* Loading global modules with the included [global loading extra](#extras).

_Loading CommonJS modules is not currently supported in this loader and likely won't be. If you find you need them it is more advisable to use [Node.js native module support](https://nodejs.org/dist/latest/docs/api/esm.html) where possible instead of the SystemJS Node.js loader._

#### Extras

The following [pluggable extras](dist/extras) can be dropped in with either the s.js or system.js loader:

* [AMD loading](dist/extras/amd.js) support (through `Window.define` which is created).
* [Named register](dist/extras/named-register.js) supports `System.register('name', ...)` named bundles which can then be imported as `System.import('name')` (as well as AMD named define support)
* [Dynamic import maps](dist/extras/dynamic-import-maps.js) support. This is currently a _potential_ new standard [feature](https://github.com/guybedford/import-maps-extensions#lazy-loading-of-import-maps).

The following extras are included in system.js loader by default, and can be added to the s.js loader for a smaller tailored footprint:

* [Global loading](dist/extras/global.js) support for loading global scripts and detecting the defined global as the default export. Useful for loading common library scripts from CDN like `System.import('//unpkg.com/lodash')`.
* [Module Types](dist/extras/module-types.js) `.css`, `.wasm`, `.json` [module type](docs/module-types.md) loading support in line with the existing modules specifications.

Since all loader features are hookable, custom extensions can be easily made following the same approach as the bundled extras. See the [hooks documentation](docs/hooks.md) for more information.

## SystemJS Babel

To support easy loading of TypeScript or ES modules in development SystemJS workflows, see the [SystemJS Babel Extension](https://github.com/systemjs/systemjs-babel).

SystemJS does not support direct integration with the native ES module browser loader because there is no way to share dependencies between the module systems. For extending the functionality of the native module loader in browsers, see [ES module Shims](https://github.com/guybedford/es-module-shims), which like SystemJS, provides workflows for import maps and other modules features, but on top of base-level modules support in browsers, which it does using a fast Wasm-based source rewriting to remap module specifiers.

## Performance

SystemJS is designed for production modules performance roughly only around a factor of 1.5 times the speed of native ES modules, as seen in the following performance benchmark, which was run by loading 426 javascript modules (all of `@babel/core`) on a Macbook pro with fast wifi internet connection. Each test was the average of five page loads in Chrome 80.

| Tool | Uncached | Cached |
| ---- | -------- | ------ |
| Native modules | 1668ms | 49ms |
| SystemJS | 2334ms | 81ms |

## Getting Started

[Introduction video](https://www.youtube.com/watch?v=AmdKF2UhFzw).

The [systemjs-examples repo](https://github.com/systemjs/systemjs-examples) contains a variety of examples demonstrating how to use SystemJS.

## Installation

```
npm install systemjs
```

## Documentation

* [Import Maps](docs/import-maps.md)
* [API](docs/api.md)
* [System.register](docs/system-register.md)
* [Loader Hooks](docs/hooks.md)
* [Module Types](docs/module-types.md)

## Example Usage

### Loading a System.register module
You can load [System.register](/docs/system-register.md) modules with a script element in your HTML:

```html
<script src="system.js"></script>
<script type="systemjs-module" src="/js/main.js"></script>
<script type="systemjs-module" src="import:name-of-module"></script>
```

### Loading with System.import
You can also dynamically load modules at any time with `System.import()`:

```js
System.import('/js/main.js');
```

where `main.js` is a module available in the System.register module format.

### Bundling workflow

For an example of a bundling workflow, see the Rollup Code Splitting starter project - https://github.com/rollup/rollup-starter-code-splitting.

Note that when building System modules you typically want to ensure anonymous System.register statements like:

```js
System.register([], function () { ... });
```

are emitted, as these can be loaded in a way that behaves the same as normal ES modules, and **not** named register statements like:

```js
System.register('name', [], function () { ... });
```

While these can be supported with the named register extension, this approach is typically not recommended for modern modules workflows.

### Import Maps

Say `main.js` depends on loading `'lodash'`, then we can define an import map:

```html
<script src="system.js"></script>
<script type="systemjs-importmap">
{
  "imports": {
    "lodash": "https://unpkg.com/lodash@4.17.10/lodash.js"
  }
}
</script>
<!-- Alternatively:
<script type="systemjs-importmap" src="path/to/map.json" crossorigin="anonymous"></script>
-->
<script type="systemjs-module" src="/js/main.js"></script>
```

### IE11 Support

IE11 continues to be fully supported, provided the relevant polyfills are available.

The main required polyfill is a `Promise` polyfill. If using import maps a `fetch` polyfill is also needed.

Both of these can be loaded conditionally using for example using [Bluebird Promises](http://bluebirdjs.com/docs/getting-started.html) and the [GitHub Fetch Polyfill](https://github.github.io/fetch/) over Unpkg:

```html
<script>
  if (typeof Promise === 'undefined')
    document.write('<script src="https://unpkg.com/bluebird@3.7.2/js/browser/bluebird.core.min.js"><\/script>');
  if (typeof fetch === 'undefined')
    document.write('<script src="https://unpkg.com/whatwg-fetch@3.4.1/dist/fetch.umd.js"><\/script>');
</script>
```

located _before_ the SystemJS script itself. The above will ensure these polyfills are only fetched for older browsers without `Promise` and `fetch` support.

#### Note on Import Maps Support in IE11

When using external import maps (those with `src=""` attributes), there is an IE11-specific workaround that might need to be used. Browsers should not make a network request when they see `<script type="systemjs-importmap" src="/importmap.json"></script>` during parsing of the initial HTML page. However, IE11 does so. [Codesandbox demonstration](https://codesandbox.io/s/vibrant-black-xiok4?file=/index.html)

Normally this is not an issue, as SystemJS will make an additional request via fetch/xhr for the import map. However, a problem can occur when the file is cached after the first request, since the first request caused by IE11 does not send the Origin request header by default. If the request requires CORS, the lack of an Origin request header causes many web servers (including AWS Cloudfront) to omit the response CORS headers. This can result in the resource being cached without CORS headers, which causes the later SystemJS fetch() to fail because of CORS checks.

This can be worked around by adding `crossorigin="anonymous"` as an attribute to the `<script type="systemjs-importmap">` script.

## Community Projects

A list of projects that use or work with SystemJS in providing modular browser workflows. [Post a PR](https://github.com/systemjs/systemjs/edit/master/README.md).

* [beyondjs.com](https://beyondjs.com) -TypeScript first meta-framework for universal microfrontends/micronservices.
* [esm-bundle](https://github.com/esm-bundle) - list of System.register versions for major libraries, including documentation on how to create a System.register bundle for any npm package.
* [es-dev-server](https://github.com/open-wc/open-wc/tree/master/packages/es-dev-server) - A web server for developing without a build step.
* [import map overrides](https://github.com/joeldenning/import-map-overrides/) - Dynamically inject an import map stored in local storage so that you can override the URL for any module. Can be useful for running development modules on localhost against the server.
* [js-env](https://github.com/jsenv/jsenv-core) - Collection of development tools providing a unified workflow to write JavaScript for the web, node.js or both at the same time.
* [jspm.org](https://jspm.org) - Package manager for native modules, using SystemJS for backwards compatibility.
* [single-spa](https://single-spa.js.org/) - JavaScript framework for front-end microservices.
* [systemjs-webpack-interop](https://github.com/joeldenning/systemjs-webpack-interop) - npm lib for setting webpack public path and creating webpack configs that work well with SystemJS.
* [@wener/system](https://github.com/wenerme/wode/tree/main/packages/system) - hooks to make System works with npm registry & package.json}


## Compatibility with Webpack

Code-splitting builds on top of native ES modules, like Rollup offers, are an alternative to the Webpack-style chunking approach - offering a way to utilize the native module loader for loading shared and dynamic chunks instead of using a custom registry and loader as Webpack bundles include. Scope-level optimizations can be performed on ES modules when they are combined, while ensuring no duplicate code is loaded through dynamic loading and code-sharing in the module registry, using the features of the native module loader and its dynamic runtime nature.

[systemjs-webpack-interop](https://github.com/joeldenning/systemjs-webpack-interop) is a community-maintained npm library that might help you get webpack and systemjs working well together.

As of webpack@4.30.0, it is now possible to compile webpack bundles to System.register format, by modifying your webpack config:

```js
{
  output: {
    libraryTarget: 'system', 
  }
}
```

If using webpack@<5, the following config is needed to avoid rewriting references to the global `System` variable:

```js
{
  module: {
    rules: [
      { parser: { system: false } }
    ]
  }
}
```

## Using npm packages

Third party libraries and npm packages may be used as long as they are published in [a supported module format](https://github.com/systemjs/systemjs/blob/master/docs/module-types.md). For packages that do not exist in a supported module format, [here is a list of github repos](https://github.com/esm-bundle/) that publish `System.register` versions of popular third party libraries (such as react, react-dom, rxjs, etc).

## Contributing to SystemJS

Project bug fixes and changes are welcome for discussion, provided the project footprint remains minimal.

Task running is handled by Chomp (https://chompbuild.com).

To run the tests:

```
npm install -g chomp
chomp test
```

## Changes

For the changelog, see [CHANGELOG.md](CHANGELOG.md).

## License

MIT
