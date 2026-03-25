# pug-linker

Link multiple pug ASTs together using include/extends

[![Build Status](https://img.shields.io/travis/pugjs/pug-linker/master.svg)](https://travis-ci.org/pugjs/pug-linker)
[![Dependencies Status](https://david-dm.org/pugjs/pug/status.svg?path=packages/pug-linker)](https://david-dm.org/pugjs/pug?path=packages/pug-linker)
[![DevDependencies Status](https://david-dm.org/pugjs/pug/dev-status.svg?path=packages/pug-linker)](https://david-dm.org/pugjs/pug?path=packages/pug-linker&type=dev)
[![NPM version](https://img.shields.io/npm/v/pug-linker.svg)](https://www.npmjs.org/package/pug-linker)

## Installation

    npm install pug-linker

## Usage

```js
var link = require('pug-linker');
```

### `link(ast)`

Flatten the Pug AST of inclusion and inheritance.

This function merely links the AST together; it doesn't read the file system to resolve and parse included and extended files. Thus, the main AST must already have the ASTs of the included and extended files embedded in the `FileReference` nodes. `pug-load` is designed to do that.

## License

  MIT
