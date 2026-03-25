# sass-lookup

[![CI](https://img.shields.io/github/actions/workflow/status/dependents/node-sass-lookup/ci.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/node-sass-lookup/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/sass-lookup?logo=npm&logoColor=fff)](https://www.npmjs.com/package/sass-lookup)
[![npm downloads](https://img.shields.io/npm/dm/sass-lookup)](https://www.npmjs.com/package/sass-lookup)

> Get the file associated with a Sass import

This module replaces the Sass compiler's lookup algorithm for resolving a partial's path.

* Handles underscored/non-underscored partials, partials with filenames, partials within subdirectories, partials with the `.scss` in the name, all of it.

*Originally built for [Dependents](https://github.com/dependents/Dependents)*

## Usage

```js
const sassLookup = require('sass-lookup');

sassLookup({
  dependency: 'foo',
  filename: 'path/to/filename',
  directory: 'path/to/directory'
})
```

* `dependency`: The partial's name
  * If your sass file had `@import "foo";`, then `"foo"` would be the dependency name
* `filename`: The file importing the dependency
* `directory`: The location(s) of all sass files
  * A list of multiple directories is also supported for this argument.

Example:

```js
const sassLookup = require('sass-lookup');

sassLookup({
  dependency: 'variables',
  filename: 'app/styles/styles.scss',
  directory: 'app/styles'
}); // yields app/styles/variables.scss
```

* This assumes that the file `app/styles/styles.scss` has `@import "variables";` and that all of the other sass files are located within `app/styles`.
* Would yield `app/styles/_variables.scss` if the partial had an underscored filename.

## CLI

Assumes a global install of sass-lookup with `npm install -g sass-lookup`

```sh
sass-lookup [options] path/to/file
```

Run `sass-lookup --help` to see all the options.

## License

[MIT](LICENSE)
