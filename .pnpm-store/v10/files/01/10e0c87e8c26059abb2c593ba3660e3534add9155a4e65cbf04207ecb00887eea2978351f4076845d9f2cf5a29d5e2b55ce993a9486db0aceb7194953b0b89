# stylus-lookup

[![CI](https://img.shields.io/github/actions/workflow/status/dependents/node-stylus-lookup/ci.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/node-stylus-lookup/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/stylus-lookup?logo=npm&logoColor=fff)](https://www.npmjs.com/package/stylus-lookup)
[![npm downloads](https://img.shields.io/npm/dm/stylus-lookup)](https://www.npmjs.com/package/stylus-lookup)

> Get the file associated with a Stylus import

This module replaces the Stylus compiler's lookup algorithm for resolving a partial's path.

* Handles same directory lookups,
partials with or without extensions, partials within subdirectories,
partials with the `.styl` or `.css` in the name,
partials using the `index.styl` resolution.

* **Does not** currently support glob imports or the use of additional paths. PRs welcome.

*Originally built for [Dependents](https://github.com/dependents/Dependents)*

## Usage

```js
const stylusLookup = require('stylus-lookup');

stylusLookup({
  dependency: 'foo',
  filename: 'path/to/file',
  directory: 'path/to/all/files'
});
```

* `dependency`: The partial's name
  * If your stylus file had `@import foo`, then `foo` would be the dependency name
* `filename`: The file importing the dependency
* `directory`: The location of all stylus files

Example:

```js
const stylusLookup = require('stylus-lookup');

stylusLookup({
  dependency: 'variables',
  filename: 'app/styles/styles.styl',
  directory: 'app/styles'
}); // yields app/styles/variables.styl
```

* This assumes that the file `app/styles/styles.styl` has `@import variables` or `@require variables`
and that all of the other stylus files are located within `app/styles`.

## CLI

Assumes a global install of stylus-lookup with `npm install -g stylus-lookup`

```sh
stylus-lookup [options] path/to/file
```

Run `stylus-lookup --help` to see all the options.

## License

[MIT](LICENSE)
