> [!NOTE]
>
> This is a fork of [oxc-resolver] and [rspack-resolver], and will be used in [eslint-plugin-import-x] and [eslint-import-resolver-typescript] cause 100% compatible with [enhanced-resolve] is the non-goal of [oxc-resolver] itself, we add [enhanced-resolve] specific features like [`pnp support`](https://github.com/web-infra-dev/rspack/issues/2236).
>
> We also fix several bugs reported by [eslint-plugin-import-x] and [eslint-import-resolver-typescript] users:
>
> - takes `paths` and `references` into account [at the same time](https://github.com/unrs/unrs-resolver/pull/12)
> - `references` should [take higher priority](https://github.com/unrs/unrs-resolver/pull/13)
> - support `pnpapi` core module and [package deep link](https://github.com/un-ts/eslint-plugin-import-x/issues/253)
> - enable [more targets](https://github.com/unrs/unrs-resolver/pull/29) support
> - absolute path aliasing [should not be skipped](https://github.com/import-js/eslint-import-resolver-typescript/issues/401)
> - use [napi-postinstall] for [legacy npm versions](https://github.com/unrs/unrs-resolver/issues/56)
> - Raspberry PI 4 aarch64 [compatibility issue](https://github.com/unrs/unrs-resolver/issues/64) and [import-js/eslint-import-resolver-typescript#406](https://github.com/import-js/eslint-import-resolver-typescript/issues/406) due to [mimalloc-safe]
> - support `load_as_directory` for [`pnp` mode](https://github.com/import-js/eslint-import-resolver-typescript/issues/409)
> - [resolve parent base url correctly](https://github.com/import-js/eslint-import-resolver-typescript/issues/437) by normalizing as absolute path
>
> The list could be longer in the future, but we don't want to make it too long here.
>
> We also sync with [oxc-resolver] and [rspack-resolver] regularly to keep up with the latest changes:
>
> - `oxc-resolver`: [#15](https://github.com/unrs/unrs-resolver/pull/15), [#49](https://github.com/unrs/unrs-resolver/pull/49), [#62](https://github.com/unrs/unrs-resolver/pull/62), [#86](https://github.com/unrs/unrs-resolver/pull/86) and [#94](https://github.com/unrs/unrs-resolver/pull/94)
> - `rspack-resolver`(planned): [#59](https://github.com/unrs/unrs-resolver/issues/59)
>
> Last but not least, we prepare some bug fix PRs first on our side and PR back into upstream projects, and we will keep doing this in the future:
>
> - `oxc-resolver`: [#84](https://github.com/unrs/unrs-resolver/pull/84) with [oxc-resolver#455](https://github.com/oxc-project/oxc-resolver/pull/455)
> - `rspack-resolver`: [#7](https://github.com/unrs/unrs-resolver/pull/7) with [rspack-resolver#54](https://github.com/web-infra-dev/rspack-resolver/pull/54), which is eventually replaced by [oxc-resolver#443](https://github.com/oxc-project/oxc-resolver/pull/443)

<div align="center">

[![Crates.io][crates-badge]][crates-url]
[![npmjs.com][npm-badge]][npm-url]

[![Docs.rs][docs-badge]][docs-url]
[![Build Status][ci-badge]][ci-url]
[![Code Coverage][code-coverage-badge]][code-coverage-url]
[![CodSpeed Badge][codspeed-badge]][codspeed-url]
[![Sponsors][sponsors-badge]][sponsors-url]
[![MIT licensed][license-badge]][license-url]

</div>

# UnRS Resolver

Rust port of [enhanced-resolve].

- Released on [crates.io][crates-url] and [npm][npm-url].
- Implements the [ESM](https://nodejs.org/api/esm.html#resolution-algorithm) and [CommonJS](https://nodejs.org/api/modules.html#all-together) module resolution algorithm specification.
- Built-in [tsconfig-paths-webpack-plugin]
  - support extending tsconfig defined in `tsconfig.extends`
  - support paths alias defined in `tsconfig.compilerOptions.paths`
  - support project references defined `tsconfig.references`
  - support [template variable ${configDir} for substitution of config files directory path](https://github.com/microsoft/TypeScript/pull/58042)
- Supports in-memory file system via the `FileSystem` trait.
- Contains `tracing` instrumentation.

## Usage

### npm package

See `index.d.ts` for `resolveSync` and `ResolverFactory` API.

Quick example:

```javascript
import assert from 'node:assert';
import path from 'node:path';

import resolve, { ResolverFactory } from 'unrs-resolver';

// `resolve`
assert(resolve.sync(process.cwd(), './index.js').path, path.resolve('index.js'));

// `ResolverFactory`
const resolver = new ResolverFactory();
assert(resolver.sync(process.cwd(), './index.js').path, path.resolve('index.js'));
```

### Rust

See [docs.rs/unrs_resolver](https://docs.rs/unrs_resolver/latest/unrs_resolver/).

## Terminology

### `directory`

An **absolute** path to a directory where the specifier is resolved against.

For CommonJS modules, it is the `__dirname` variable that contains the absolute path to the folder containing current module.

For ECMAScript modules, it is the value of `import.meta.dirname`.

Behavior is undefined when given a path to a file.

### `specifier`

The string passed to `require` or `import`, i.e. `require("specifier")` or `import "specifier"`

## Errors and Trouble Shooting

- `Error: Package subpath '.' is not defined by "exports" in` - occurs when resolving without `conditionNames`.

## Configuration

The following usages apply to both Rust and Node.js; the code snippets are written in JavaScript.

To handle the `exports` field in `package.json`, ESM and CJS need to be differentiated.

### ESM

Per [ESM Resolution algorithm](https://nodejs.org/api/esm.html#resolution-and-loading-algorithm)

> defaultConditions is the conditional environment name array, ["node", "import"].

This means when the caller is an ESM import (`import "module"`), resolve options should be

```javascript
{
  "conditionNames": ["node", "import"]
}
```

### CJS

Per [CJS Resolution algorithm](https://nodejs.org/api/modules.html#all-together)

> LOAD_PACKAGE_EXPORTS(X, DIR)
>
> 5. let MATCH = PACKAGE_EXPORTS_RESOLVE(pathToFileURL(DIR/NAME), "." + SUBPATH,
>    `package.json` "exports", ["node", "require"]) defined in the ESM resolver.

This means when the caller is a CJS require (`require("module")`), resolve options should be

```javascript
{
  "conditionNames": ["node", "require"]
}
```

### Cache

To support both CJS and ESM with the same cache:

```javascript
const esmResolver = new ResolverFactory({
  conditionNames: ['node', 'import'],
});

const cjsResolver = esmResolver.cloneWithOptions({
  conditionNames: ['node', 'require'],
});
```

### Browser Field

From this [non-standard spec](https://github.com/defunctzombie/package-browser-field-spec):

> The `browser` field is provided to JavaScript bundlers or component tools when packaging modules for client side use.

The option is

```javascript
{
  "aliasFields": ["browser"]
}
```

### Main Field

```javascript
{
  "mainFields": ["module", "main"]
}
```

Quoting esbuild's documentation:

- `main` - This is [the standard field](https://docs.npmjs.com/files/package.json#main) for all packages that are meant to be used with node. The name main is hard-coded in to node's module resolution logic itself. Because it's intended for use with node, it's reasonable to expect that the file path in this field is a CommonJS-style module.
- `module` - This field came from a [proposal](https://github.com/dherman/defense-of-dot-js/blob/f31319be735b21739756b87d551f6711bd7aa283/proposal.md) for how to integrate ECMAScript modules into node. Because of this, it's reasonable to expect that the file path in this field is an ECMAScript-style module. This proposal wasn't adopted by node (node uses "type": "module" instead) but it was adopted by major bundlers because ECMAScript-style modules lead to better tree shaking, or dead code removal.
- `browser` - This field came from a [proposal](https://gist.github.com/defunctzombie/4339901/49493836fb873ddaa4b8a7aa0ef2352119f69211) that allows bundlers to replace node-specific files or modules with their browser-friendly versions. It lets you specify an alternate browser-specific entry point. Note that it is possible for a package to use both the browser and module field together (see the note below).

## Options

The following options are aligned with [enhanced-resolve], and is implemented for Rust crate usage.

See [index.d.ts](https://github.com/unrs/unrs-resolver/blob/main/napi/index.d.ts) for Node.js usage.

| Field            | Default                   | Description                                                                                                                                               |
| ---------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| alias            | {}                        | A hash map of module alias configurations                                                                                                                 |
| aliasFields      | []                        | A list of alias fields in description files                                                                                                               |
| extensionAlias   | {}                        | An object which maps extension to extension aliases                                                                                                       |
| conditionNames   | []                        | A list of exports field condition names                                                                                                                   |
| descriptionFiles | ["package.json"]          | A list of description files to read from                                                                                                                  |
| enforceExtension | false                     | Enforce that an extension from extensions must be used                                                                                                    |
| exportsFields    | ["exports"]               | A list of exports fields in description files                                                                                                             |
| extensions       | [".js", ".json", ".node"] | A list of extensions which should be tried for files                                                                                                      |
| fallback         | {}                        | Same as `alias`, but only used if default resolving fails                                                                                                 |
| fileSystem       |                           | The file system which should be used                                                                                                                      |
| fullySpecified   | false                     | Request passed to resolve is already fully specified and extensions or main files are not resolved for it (they are still resolved for internal requests) |
| mainFields       | ["main"]                  | A list of main fields in description files                                                                                                                |
| mainFiles        | ["index"]                 | A list of main files in directories                                                                                                                       |
| modules          | ["node_modules"]          | A list of directories to resolve modules from, can be absolute path or folder name                                                                        |
| resolveToContext | false                     | Resolve to a context instead of a file                                                                                                                    |
| preferRelative   | false                     | Prefer to resolve module requests as relative request and fallback to resolving as module                                                                 |
| preferAbsolute   | false                     | Prefer to resolve server-relative urls as absolute paths before falling back to resolve in roots                                                          |
| restrictions     | []                        | A list of resolve restrictions                                                                                                                            |
| roots            | []                        | A list of root paths                                                                                                                                      |
| symlinks         | true                      | Whether to resolve symlinks to their symlinked location, [if possible](https://github.com/unrs/unrs-resolver/blob/main/src/options.rs#L157-L170).         |

### Unimplemented Options

| Field            | Default                     | Description                                                                                                                                   |
| ---------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| cachePredicate   | function() { return true }; | A function which decides whether a request should be cached or not. An object is passed to the function with `path` and `request` properties. |
| cacheWithContext | true                        | If unsafe cache is enabled, includes `request.context` in the cache key                                                                       |
| plugins          | []                          | A list of additional resolve plugins which should be applied                                                                                  |
| resolver         | undefined                   | A prepared Resolver to which the plugins are attached                                                                                         |
| unsafeCache      | false                       | Use this cache object to unsafely cache the successful requests                                                                               |

## Debugging

The following environment variable emits tracing information for the `oxc_resolver::resolve` function.

e.g.

```
2024-06-11T07:12:20.003537Z DEBUG oxc_resolver: options: ResolveOptions { ... }, path: "...", specifier: "...", ret: "..."
    at /path/to/oxc_resolver-1.8.1/src/lib.rs:212
    in oxc_resolver::resolve with path: "...", specifier: "..."
```

The input values are `options`, `path` and `specifier`, the returned value is `ret`.

### NAPI

```
UNRS_LOG=DEBUG your_program
```

## Test

Tests are ported from

- [enhanced-resolve](https://github.com/webpack/enhanced-resolve/tree/main/test)
- [tsconfig-path](https://github.com/dividab/tsconfig-paths/blob/master/src/__tests__/data/match-path-data.ts) and [parcel-resolver](https://github.com/parcel-bundler/parcel/tree/v2/packages/utils/node-resolver-core/test/fixture/tsconfig) for tsconfig-paths

Test cases are located in `./src/tests`, fixtures are located in `./tests`

- [x] alias.test.js
- [x] browserField.test.js
- [x] dependencies.test.js
- [x] exportsField.test.js
- [x] extension-alias.test.js
- [x] extensions.test.js
- [x] fallback.test.js
- [x] fullSpecified.test.js
- [x] identifier.test.js (see unit test in `crates/oxc_resolver/src/request.rs`)
- [x] importsField.test.js
- [x] incorrect-description-file.test.js (need to add ctx.fileDependencies)
- [x] missing.test.js
- [x] path.test.js (see unit test in `crates/oxc_resolver/src/path.rs`)
- [ ] plugins.test.js
- [ ] pnp.test.js
- [x] resolve.test.js
- [x] restrictions.test.js (partially done, regex is not supported yet)
- [x] roots.test.js
- [x] scoped-packages.test.js
- [x] simple.test.js
- [x] symlink.test.js

Irrelevant tests

- CachedInputFileSystem.test.js
- SyncAsyncFileSystemDecorator.test.js
- forEachBail.test.js
- getPaths.test.js
- pr-53.test.js
- unsafe-cache.test.js
- yield.test.js

## [Sponsored By](https://github.com/sponsors/JounQin)

[![Sponsors](https://raw.githubusercontent.com/1stG/static/master/sponsors.svg)](https://github.com/sponsors/JounQin)

### Sponsors

| 1stG                                                                                                                               | UnRs                                                                                                                               | UnTS                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| [![1stG Open Collective backers and sponsors](https://opencollective.com/1stG/organizations.svg)](https://opencollective.com/1stG) | [![UnRs Open Collective backers and sponsors](https://opencollective.com/unrs/organizations.svg)](https://opencollective.com/unrs) | [![UnTS Open Collective backers and sponsors](https://opencollective.com/unts/organizations.svg)](https://opencollective.com/unts) |

### Backers

| 1stG                                                                                                                             | UnRs                                                                                                                             | UnTS                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [![1stG Open Collective backers and sponsors](https://opencollective.com/1stG/individuals.svg)](https://opencollective.com/1stG) | [![UnRs Open Collective backers and sponsors](https://opencollective.com/unrs/individuals.svg)](https://opencollective.com/unrs) | [![UnTS Open Collective backers and sponsors](https://opencollective.com/unts/individuals.svg)](https://opencollective.com/unts) |

## 📖 License

`unrs_resolver` is free and open-source software licensed under the [MIT License](./LICENSE).

UnRS partially copies code from the following projects.

| Project                                                                           | License                                                                      |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [webpack/enhanced-resolve](https://github.com/webpack/enhanced-resolve)           | [MIT](https://github.com/webpack/enhanced-resolve/blob/main/LICENSE)         |
| [dividab/tsconfig-paths](https://github.com/dividab/tsconfig-paths)               | [MIT](https://github.com/dividab/tsconfig-paths/blob/master/LICENSE)         |
| [parcel-bundler/parcel](https://github.com/parcel-bundler/parcel)                 | [MIT](https://github.com/parcel-bundler/parcel/blob/v2/LICENSE)              |
| [tmccombs/json-comments-rs](https://github.com/tmccombs/json-comments-rs)         | [Apache 2.0](https://github.com/tmccombs/json-comments-rs/blob/main/LICENSE) |
| [oxc-project/oxc-resolver](https://github.com/oxc-project/oxc-resolver)           | [MIT](https://github.com/oxc-project/oxc-resolver/blob/main/LICENSE)         |
| [web-infra-dev/rspack-resolver](https://github.com/web-infra-dev/rspack-resolver) | [MIT](https://github.com/web-infra-dev/rspack-resolver/blob/main/LICENSE)    |

[enhanced-resolve]: https://github.com/webpack/enhanced-resolve
[oxc-resolver]: https://github.com/oxc-project/oxc-resolver
[rspack-resolver]: https://github.com/web-infra-dev/rspack-resolver
[eslint-plugin-import-x]: https://github.com/un-ts/eslint-plugin-import-x
[eslint-import-resolver-typescript]: https://github.com/import-js/eslint-import-resolver-typescript
[napi-postinstall]: https://github.com/un-ts/napi-postinstall
[mimalloc-safe]: https://github.com/napi-rs/mimalloc-safe
[tsconfig-paths-webpack-plugin]: https://github.com/dividab/tsconfig-paths-webpack-plugin
[license-badge]: https://img.shields.io/badge/license-MIT-blue.svg
[license-url]: https://github.com/unrs/unrs-resolver/blob/main/LICENSE
[ci-badge]: https://github.com/unrs/unrs-resolver/actions/workflows/ci.yml/badge.svg?event=push&branch=main
[ci-url]: https://github.com/unrs/unrs-resolver/actions/workflows/ci.yml?query=event%3Apush+branch%3Amain
[code-coverage-badge]: https://codecov.io/github/unrs/unrs-resolver/branch/main/graph/badge.svg
[code-coverage-url]: https://codecov.io/gh/unrs/unrs-resolver
[sponsors-badge]: https://img.shields.io/github/sponsors/JounQin
[sponsors-url]: https://github.com/sponsors/JounQin
[codspeed-badge]: https://img.shields.io/endpoint?url=https://codspeed.io/badge.json
[codspeed-url]: https://codspeed.io/unrs/unrs-resolver
[crates-badge]: https://img.shields.io/crates/d/unrs_resolver?label=crates.io
[crates-url]: https://crates.io/crates/unrs_resolver
[docs-badge]: https://img.shields.io/docsrs/unrs_resolver
[docs-url]: https://docs.rs/unrs_resolver
[npm-badge]: https://img.shields.io/npm/dw/unrs-resolver?label=npm
[npm-url]: https://www.npmjs.com/package/unrs-resolver
