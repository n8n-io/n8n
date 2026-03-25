# get-amd-module-type

[![CI](https://img.shields.io/github/actions/workflow/status/dependents/node-get-amd-module-type/ci.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/node-get-amd-module-type/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/get-amd-module-type?logo=npm&logoColor=fff)](https://www.npmjs.com/package/get-amd-module-type)
[![npm downloads](https://img.shields.io/npm/dm/get-amd-module-type)](https://www.npmjs.com/package/get-amd-module-type)

> Get the type of an AMD module used for an AST node or within a file

```sh
npm install get-amd-module-type
```

## Usage

```js
const getType = require('get-amd-module-type');

// Async
getType('my/file.js', (error, type) => {
  if (error) throw error;
  console.log(type);
});

let type;

// Sync
type = getType.sync('my/file.js');

// From source code
type = getType.fromSource('define() {}');

// From an AST node
type = getType.fromAST(node);
```

The returned `type` will be any of the following:

* `'named'`: `define('name', [deps], func)`
* `'deps'`: `define([deps], func)`
* `'rem'`: `define(function(require, exports, module){});`
* `'factory'`: `define(function(require){})`
* `'nodeps'`: `define({})`
* `'driver'`: `require([deps], function)`

## License

[MIT](LICENSE)
