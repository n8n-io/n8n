[npm]: https://img.shields.io/npm/v/@rollup/plugin-node-resolve
[npm-url]: https://www.npmjs.com/package/@rollup/plugin-node-resolve
[size]: https://packagephobia.now.sh/badge?p=@rollup/plugin-node-resolve
[size-url]: https://packagephobia.now.sh/result?p=@rollup/plugin-node-resolve

[![npm][npm]][npm-url]
[![size][size]][size-url]
[![libera manifesto](https://img.shields.io/badge/libera-manifesto-lightgrey.svg)](https://liberamanifesto.com)

# @rollup/plugin-node-resolve

🍣 A Rollup plugin which locates modules using the [Node resolution algorithm](https://nodejs.org/api/modules.html#modules_all_together), for using third party modules in `node_modules`

## Requirements

This plugin requires an [LTS](https://github.com/nodejs/Release) Node version (v8.0.0+) and Rollup v1.20.0+.

## Install

Using npm:

```console
npm install @rollup/plugin-node-resolve --save-dev
```

## Usage

Create a `rollup.config.js` [configuration file](https://www.rollupjs.org/guide/en/#configuration-files) and import the plugin:

```js
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.js',
  output: {
    dir: 'output',
    format: 'cjs'
  },
  plugins: [nodeResolve()]
};
```

Then call `rollup` either via the [CLI](https://www.rollupjs.org/guide/en/#command-line-reference) or the [API](https://www.rollupjs.org/guide/en/#javascript-api).

## Options

### `browser`

Type: `Boolean`<br>
Default: `false`

If `true`, instructs the plugin to use the `"browser"` property in `package.json` files to specify alternative files to load for bundling. This is useful when bundling for a browser environment. Alternatively, a value of `'browser'` can be added to the `mainFields` option. If `false`, any `"browser"` properties in package files will be ignored. This option takes precedence over `mainFields`.

### `customResolveOptions`

Type: `Object`<br>
Default: `null`

An `Object` that specifies additional options that should be passed through to [`resolve`](https://www.npmjs.com/package/resolve).

```
customResolveOptions: {
  moduleDirectory: 'js_modules'
}
```

### `dedupe`

Type: `Array[...String]`<br>
Default: `[]`

An `Array` of modules names, which instructs the plugin to force resolving for the specified modules to the root `node_modules`. Helps to prevent bundling the same package multiple times if package is imported from dependencies.

```js
dedupe: ['my-package', '@namespace/my-package'];
```

This will deduplicate bare imports such as:

```js
import 'my-package';
import '@namespace/my-package';
```

And it will deduplicate deep imports such as:

```js
import 'my-package/foo.js';
import '@namespace/my-package/bar.js';
```

### `extensions`

Type: `Array[...String]`<br>
Default: `['.mjs', '.js', '.json', '.node']`

Specifies the extensions of files that the plugin will operate on.

### `jail`

Type: `String`<br>
Default: `'/'`

Locks the module search within specified path (e.g. chroot). Modules defined outside this path will be marked as external.

### `mainFields`

Type: `Array[...String]`<br>
Default: `['module', 'main']`<br>
Valid values: `['browser', 'jsnext:main', 'module', 'main']`

Specifies the properties to scan within a `package.json`, used to determine the bundle entry point. The order of property names is significant, as the first-found property is used as the resolved entry point. If the array contains `'browser'`, key/values specified in the `package.json` `browser` property will be used.

### `only`

DEPRECATED: use "resolveOnly" instead

### `preferBuiltins`

Type: `Boolean`<br>
Default: `true`

If `true`, the plugin will prefer built-in modules (e.g. `fs`, `path`). If `false`, the plugin will look for locally installed modules of the same name.

### `modulesOnly`

Type: `Boolean`<br>
Default: `false`

If `true`, inspect resolved files to assert that they are ES2015 modules.

### `resolveOnly`

Type: `Array[...String|RegExp]`<br>
Default: `null`

An `Array` which instructs the plugin to limit module resolution to those whose names match patterns in the array. _Note: Modules not matching any patterns will be marked as external._

Example: `resolveOnly: ['batman', /^@batcave\/.*$/]`

### `rootDir`

Type: `String`<br>
Default: `process.cwd()`

Specifies the root directory from which to resolve modules. Typically used when resolving entry-point imports, and when resolving deduplicated modules. Useful when executing rollup in a package of a mono-repository.

```
// Set the root directory to be the parent folder
rootDir: path.join(process.cwd(), '..')
```

## Using with @rollup/plugin-commonjs

Since most packages in your node_modules folder are probably legacy CommonJS rather than JavaScript modules, you may need to use [@rollup/plugin-commonjs](https://github.com/rollup/plugins/tree/master/packages/commonjs):

```js
// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'main.js',
  output: {
    file: 'bundle.js',
    format: 'iife',
    name: 'MyModule'
  },
  plugins: [resolve(), commonjs()]
};
```

## Resolving Built-Ins (like `fs`)

This plugin won't resolve any builtins (e.g. `fs`). If you need to resolve builtins you can install local modules and set `preferBuiltins` to `false`, or install a plugin like [rollup-plugin-node-polyfills](https://github.com/ionic-team/rollup-plugin-node-polyfills) which provides stubbed versions of these methods.

If you want to silence warnings about builtins, you can add the list of builtins to the `externals` option; like so:

```js
import resolve from '@rollup/plugin-node-resolve';
import builtins from 'builtin-modules'
export default ({
  input: ...,
  plugins: [resolve()],
  external: builtins,
  output: ...
})
```

## Meta

[CONTRIBUTING](/.github/CONTRIBUTING.md)

[LICENSE (MIT)](/LICENSE)
