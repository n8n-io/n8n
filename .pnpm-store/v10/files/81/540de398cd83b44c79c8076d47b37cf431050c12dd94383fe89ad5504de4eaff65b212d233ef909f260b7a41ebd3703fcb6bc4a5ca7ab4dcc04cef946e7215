# pug-load

The pug loader is responsible for loading the depenendencies of a given pug file.  It adds `fullPath` and `str` properties to every `Include` and `Extends` node.  It also adds an `ast` property to any `Include` nodes that are loading pug and any `Extends` nodes.  It then recursively loads the dependencies of any of those included files.

[![Build Status](https://img.shields.io/travis/pugjs/pug-load/master.svg)](https://travis-ci.org/pugjs/pug-load)
[![Dependencies Status](https://david-dm.org/pugjs/pug/status.svg?path=packages/pug-load)](https://david-dm.org/pugjs/pug?path=packages/pug-load)
[![DevDependencies Status](https://david-dm.org/pugjs/pug/dev-status.svg?path=packages/pug-load)](https://david-dm.org/pugjs/pug?path=packages/pug-load&type=dev)
[![NPM version](https://img.shields.io/npm/v/pug-load.svg)](https://www.npmjs.org/package/pug-load)
[![Coverage Status](https://img.shields.io/codecov/c/github/pugjs/pug-load.svg)](https://codecov.io/gh/pugjs/pug-load)

## Installation

    npm install pug-load

## Usage

```js
var load = require('pug-load');
```

### `load(ast, options)`
### `load.string(str, filename, options)`
### `load.file(filename, options)`

Loads all dependencies of the Pug AST. `load.string` and `load.file` are syntactic sugar that parses the string or file instead of you doing it yourself.

`options` may contain the following properties:

- `lex` (function): **(required)** the lexer used
- `parse` (function): **(required)** the parser used
- `resolve` (function): a function used to override `load.resolve`. Defaults to `load.resolve`.
- `read` (function): a function used to override `load.read`. Defaults to `load.read`.
- `basedir` (string): the base directory of absolute inclusion. This is **required** when absolute inclusion (file name starts with `'/'`) is used. Defaults to undefined.

The `options` object is passed to `load.resolve` and `load.read`, or equivalently `options.resolve` and `options.read`.

### `load.resolve(filename, source, options)`

Callback used by `pug-load` to resolve the full path of an included or extended file given the path of the source file.

`filename` is the included file. `source` is the name of the parent file that includes `filename`.

This function is not meant to be called from outside of `pug-load`, but rather for you to override.

### `load.read(filename, options)`

Callback used by `pug-load` to return the contents of a file.

`filename` is the file to read.

This function is not meant to be called from outside of `pug-load`, but rather for you to override.

### `load.validateOptions(options)`

Callback used `pug-load` to ensure the options object is valid. If your overridden `load.resolve` or `load.read` uses a different `options` scheme, you will need to override this function as well.

This function is not meant to be called from outside of `pug-load`, but rather for you to override.

### Example

```js
var fs = require('fs');
var lex = require('pug-lexer');
var parse = require('pug-parser');
var load = require('pug-load');

// you can do everything very manually

var str = fs.readFileSync('bar.pug', 'utf8');
var ast = load(parse(lex(str, 'bar.pug'), 'bar.pug'), {
  lex: lex,
  parse: parse,
  resolve: function (filename, source, options) {
    console.log('"' + filename + '" file requested from "' + source + '".');
    return load.resolve(filename, source, options);
  }
});

// or you can do all that in just two steps

var str = fs.readFileSync('bar.pug', 'utf8');
var ast = load.string(str, 'bar.pug', {
  lex: lex,
  parse: parse,
  resolve: function (filename, source, options) {
    console.log('"' + filename + '" file requested from "' + source + '".');
    return load.resolve(filename, source, options);
  }
});

// or you can do all that in only one step

var ast = load.file('bar.pug', {
  lex: lex,
  parse: parse,
  resolve: function (filename, source, options) {
    console.log('"' + filename + '" file requested from "' + source + '".');
    return load.resolve(filename, source, options);
  }
});
```

## License

  MIT
