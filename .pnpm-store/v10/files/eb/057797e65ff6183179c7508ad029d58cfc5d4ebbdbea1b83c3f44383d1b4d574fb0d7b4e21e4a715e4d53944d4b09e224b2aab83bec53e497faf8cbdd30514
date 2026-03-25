# precinct

[![CI](https://img.shields.io/github/actions/workflow/status/dependents/node-precinct/ci.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/node-precinct/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/precinct?logo=npm&logoColor=fff)](https://www.npmjs.com/package/precinct)
[![npm downloads](http://img.shields.io/npm/dm/precinct)](https://www.npmjs.com/package/precinct)

> Unleash the detectives

```sh
npm install precinct
```

Uses the appropriate detective to find the dependencies of a file or its AST.

Supports:

* JavaScript modules: AMD, CommonJS, and ES6
* TypeScript
* CSS Preprocessors: Sass, Scss, Stylus, and Less
* CSS (PostCSS)

## Usage

```js
const fs = require('fs');
const precinct = require('precinct');

const content = fs.readFileSync('myFile.js', 'utf8');

// Pass in a file's content or an AST
const deps = precinct(content);
```

You may pass options (to individual detectives) based on the module type via an optional second object argument `detective(content, options)`, for example:

Example call:

```js
precinct(content, {
  amd: {
    skipLazyLoaded: true
  },
  type: 'amd'
});
```

* The supported module type prefixes are: `amd`, `commonjs`, `css`, `es6`, `less`, `sass`, `scss`, `stylus`, `ts`, `tsx`, `vue`.

Current options:

* `amd.skipLazyLoaded`: tells the AMD detective to omit lazy-loaded dependencies (i.e., inner requires).
* `es6.mixedImports`: allows for all dependencies to be fetched from a file that contains both CJS and ES6 imports.
  * Note: This will work for any file format that contains an ES6 import.
* `css.url`: tells the CSS detective to include `url()` references to images, fonts, etc.

Finding non-JavaScript (ex: Sass and Stylus) dependencies:

```js
const fs = require('fs');
const content = fs.readFileSync('styles.scss', 'utf8');

const sassDeps = precinct(content, { type: 'sass' });
const stylusDeps = precinct(content, { type: 'stylus' });
```

Or, if you just want to pass in a filepath and get the dependencies:

```js
const { paperwork } = require('precinct');

const deps = paperwork('myFile.js');
const deps2 = paperwork('styles.scss');
```

### `precinct.paperwork(filename, options)`

Supported options:

* `includeCore`: (default: `true`) set to `false` to exclude core Node.js dependencies from the list of dependencies.
* `fileSystem`: (default: `undefined`) set to an alternative `fs` implementation that will be used to read the file path.
* You may also pass detective-specific configuration like you would to `precinct(content, options)`.

### CLI

Assumes a global install precinct with `npm install -g precinct`.

```sh
precinct [options] path/to/file
```

Run `precinct --help` to see all options.

## License

[MIT](LICENSE)
