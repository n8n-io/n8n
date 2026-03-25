# resolve-dependency-path

[![CI](https://img.shields.io/github/actions/workflow/status/dependents/node-resolve-dependency-path/ci.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/node-resolve-dependency-path/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/resolve-dependency-path?logo=npm&logoColor=fff)](https://www.npmjs.com/package/resolve-dependency-path)
[![npm downloads](https://img.shields.io/npm/dm/resolve-dependency-path)](https://www.npmjs.com/package/resolve-dependency-path)

> Convert a dependency path into a filepath

```sh
npm install resolve-dependency-path
```

## Usage

```js
const resolvePath = require('resolve-dependency-path');

const resolved = resolvePath({
  dependency: './foobar',
  filename: 'path/to/file/containing/dependency.js',
  directory: 'path/to/all/files'
});
```

* `dependency`: the actual dependency path (probably extracted from a `require()`)
* `filename`: the file that required this dependency (likely the file whose dependencies are being extracted)
* `directory`: the root of all modules being processed. Dependencies are often about this root unless they're relative.

## Example

If you have a file like:

*myapp/foo.js*

```js
var require('./bar');
```

Then if you want to open the file associated with the dependency, you need to resolve `./bar` onto the filesystem.

Since `./bar` is a relative path, it should be resolved relative to `foo.js`,
more specifically the directory containing `foo.js`, `myapp/`. This resolution would yield
`myapp/bar.js`.

This is why the `filename` attribute is required to use this library.

If you have a non-relative dependency path like:

*myapp/foo.js*

```js
define([
  'bar'
], function(bar) {

});
```

Then `bar` is relative to the root of all files, `myapp`. The resolution would yield
`myapp/bar.js`.

A more complex example with subdirectories:

*myapp/feature1/foo.js*

```js
define([
  'feature2/bar'
], function(bar) {

});
```

The dependency `feature2/bar` is relative to the root of all files, `myapp`, *not* the file `foo.js`.

This is why the `directory` attribute is required to use this library.

## License

[MIT](LICENSE)
