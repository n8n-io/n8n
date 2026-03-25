# ast-module-types

[![CI](https://img.shields.io/github/actions/workflow/status/dependents/node-ast-module-types/ci.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/node-ast-module-types/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/ast-module-types?logo=npm&logoColor=fff)](https://www.npmjs.com/package/ast-module-types)
[![npm downloads](https://img.shields.io/npm/dm/ast-module-types)](https://www.npmjs.com/package/ast-module-types)

Collection of useful helper functions when trying to determine
module type (CommonJS or AMD) properties of an AST node.

**AST checks are based on the Esprima (Spidermonkey) format**

```sh
npm install ast-module-types
```

## API

Each of these takes in a single AST node argument
and returns a boolean.

* `isDefineAMD`: if node matches any form of an AMD `define` function call
* `isRequire`: if node matches a `require` function all (declaring a dependency)
* `isTopLevelRequire`: if node matches a `require` at the very top of the file.
* `isAMDDriverScriptRequire`: if node matches an AMD driver script's require call `require([deps], function)`
* `isExports`: if the node matches CommonJS `module.exports` or `exports` (defining a module)

Detecting the various forms of defining an AMD module

* `isNamedForm`: if the node is a define call of the form: `define('name', [deps], func)`
* `isDependencyForm`: if the node is a define call of the form: `define([deps], func)`
* `isFactoryForm`: if the node is a define call of the form: `define(func(require))`
* `isNoDependencyForm`: if the node is a define call of the form: `define({})`
* `isREMForm`: if the node matches the form: `define(function(require, exports, module){});`

ES6 Types

*All types abide by the [EStree spec](https://github.com/estree/estree/blob/master/es2015.md)*

* `isES6Import`: if the node is any of the es6 import forms
* `isES6Export`: if the node is of any es6 export forms

## Usage

```js
const types = require('ast-module-types');

// Assume node is some node of an AST that you parsed using esprima or esprima-fb
// ...

console.log(types.isDefineAMD(node));
```

## License

[MIT](LICENSE)
