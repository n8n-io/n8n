# pug-filters

Code for processing filters in pug templates

[![Build Status](https://img.shields.io/travis/pugjs/pug-filters/master.svg)](https://travis-ci.org/pugjs/pug-filters)
[![Dependencies Status](https://david-dm.org/pugjs/pug/status.svg?path=packages/pug-filters)](https://david-dm.org/pugjs/pug?path=packages/pug-filters)
[![DevDependencies Status](https://david-dm.org/pugjs/pug/dev-status.svg?path=packages/pug-filters)](https://david-dm.org/pugjs/pug?path=packages/pug-filters&type=dev)
[![NPM version](https://img.shields.io/npm/v/pug-filters.svg)](https://www.npmjs.org/package/pug-filters)

## Installation

    npm install pug-filters

## Usage

```
var filters = require('pug-filters');
```

### `filters.handleFilters(ast, filters)`

Renders all `Filter` nodes in a Pug AST (`ast`), using user-specified filters (`filters`) or a JSTransformer.

### `filters.runFilter(name, str[, options[, currentDirectory]])`

Invokes filter through `jstransformer`.

This is internally used in `filters.handleFilters`, and is a lower-level interface exclusively for invoking JSTransformer-based filters.

`name` represents the name of the JSTransformer.

`str` represents the string to render.

`currentDirectory` is used when attempting to `require` the transformer module.

`options` may contain the following properties:

- `minify` (boolean): whether or not to attempt minifying the result from the transformer. If minification fails, the original result is returned.

## License

  MIT
