[npm]: https://img.shields.io/npm/v/@rollup/plugin-inject
[npm-url]: https://www.npmjs.com/package/@rollup/plugin-inject
[size]: https://packagephobia.now.sh/badge?p=@rollup/plugin-inject
[size-url]: https://packagephobia.now.sh/result?p=@rollup/plugin-inject

[![npm][npm]][npm-url]
[![size][size]][size-url]
[![libera manifesto](https://img.shields.io/badge/libera-manifesto-lightgrey.svg)](https://liberamanifesto.com)

# @rollup/plugin-inject

🍣 A Rollup plugin which scans modules for global variables and injects `import` statements where necessary.

## Requirements

This plugin requires an [LTS](https://github.com/nodejs/Release) Node version (v14.0.0+) and Rollup v1.20.0+.

## Install

Using npm:

```console
npm install @rollup/plugin-inject --save-dev
```

## Usage

Create a `rollup.config.js` [configuration file](https://www.rollupjs.org/guide/en/#configuration-files) and import the plugin:

```js
import inject from '@rollup/plugin-inject';

export default {
  input: 'src/index.js',
  output: {
    dir: 'output',
    format: 'cjs'
  },
  plugins: [
    inject({
      Promise: ['es6-promise', 'Promise']
    })
  ]
};
```

Then call `rollup` either via the [CLI](https://www.rollupjs.org/guide/en/#command-line-reference) or the [API](https://www.rollupjs.org/guide/en/#javascript-api).

This configuration above will scan all your files for global Promise usage and plugin will add import to desired module (`import { Promise } from 'es6-promise'` in this case).

Examples:

```js
{
  // import { Promise } from 'es6-promise'
  Promise: [ 'es6-promise', 'Promise' ],

  // import { Promise as P } from 'es6-promise'
  P: [ 'es6-promise', 'Promise' ],

  // import $ from 'jquery'
  $: 'jquery',

  // import * as fs from 'fs'
  fs: [ 'fs', '*' ],

  // use a local module instead of a third-party one
  'Object.assign': path.resolve( 'src/helpers/object-assign.js' ),
}
```

Typically, `@rollup/plugin-inject` should be placed in `plugins` _before_ other plugins so that they may apply optimizations, such as dead code removal.

## Options

In addition to the properties and values specified for injecting, users may also specify the options below.

### `exclude`

Type: `String` | `Array[...String]`<br>
Default: `null`

A [picomatch pattern](https://github.com/micromatch/picomatch), or array of patterns, which specifies the files in the build the plugin should _ignore_. By default no files are ignored.

### `include`

Type: `String` | `Array[...String]`<br>
Default: `null`

A [picomatch pattern](https://github.com/micromatch/picomatch), or array of patterns, which specifies the files in the build the plugin should operate on. By default all files are targeted.

## Meta

[CONTRIBUTING](/.github/CONTRIBUTING.md)

[LICENSE (MIT)](/LICENSE)
