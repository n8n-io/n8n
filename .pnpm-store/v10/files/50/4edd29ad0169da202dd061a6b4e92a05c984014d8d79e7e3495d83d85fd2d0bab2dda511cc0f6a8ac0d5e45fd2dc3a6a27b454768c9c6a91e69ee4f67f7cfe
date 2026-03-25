# @smithy/core

[![NPM version](https://img.shields.io/npm/v/@smithy/core/latest.svg)](https://www.npmjs.com/package/@smithy/core)
[![NPM downloads](https://img.shields.io/npm/dm/@smithy/core.svg)](https://www.npmjs.com/package/@smithy/core)

> An internal package. You probably shouldn't use this package, at least directly.

This package provides common or core functionality for generic Smithy clients.

You do not need to explicitly install this package, since it will be installed during code generation if used.

## Development of `@smithy/core` submodules

Core submodules are organized for distribution via the `package.json` `exports` field.

`exports` is supported by default by the latest Node.js, webpack, and esbuild. For react-native, it can be
enabled via instructions found at [reactnative.dev/blog](https://reactnative.dev/blog/2023/06/21/package-exports-support), but we also provide a compatibility redirect.

Think of `@smithy/core` as a mono-package within the monorepo.
It preserves the benefits of modularization, for example to optimize Node.js initialization speed,
while making it easier to have a consistent version of core dependencies, reducing package sprawl when
installing a Smithy runtime client.

### Guide for submodules

- Each `index.ts` file corresponding to the pattern `./src/submodules/<MODULE_NAME>/index.ts` will be
  published as a separate `dist-cjs` bundled submodule index using the `Inliner.js` build script.
- create a folder as `./src/submodules/<SUBMODULE>` including an `index.ts` file and a `README.md` file.
  - The linter will throw an error on missing submodule metadata in `package.json` and the various `tsconfig.json` files, but it will automatically fix them if possible.
- a submodule is equivalent to a standalone `@smithy/<pkg>` package in that importing it in Node.js will resolve a separate bundle.
- submodules may not relatively import files from other submodules. Instead, directly use the `@scope/pkg/submodule` name as the import.
  - The linter will check for this and throw an error.
- To the extent possible, correctly declaring submodule metadata is validated by the linter in `@smithy/core`.
  The linter runs during `yarn build` and also as `yarn lint`.

### When should I create an `@smithy/core/submodule` vs. `@smithy/new-package`?

Keep in mind that the core package is installed by all downstream clients.

If the component functionality is upstream of multiple clients, it is
a good candidate for a core submodule. For example, if `middleware-retry` had been written
after the support for submodules was added, it would have been a submodule.

If the component's functionality is downstream of a client (rare), or only expected to be used by a very small
subset of clients, it could be written as a standalone package.
