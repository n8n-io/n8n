# module-definition

[![CI](https://img.shields.io/github/actions/workflow/status/dependents/module-definition/ci.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/module-definition/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/module-definition?logo=npm&logoColor=fff)](https://www.npmjs.com/package/module-definition)
[![npm downloads](https://img.shields.io/npm/dm/module-definition)](https://www.npmjs.com/package/module-definition)

Determines the module definition type (CommonJS, AMD, ES6, or none) for a given JavaScript file
by walking through the AST.

```sh
npm install module-definition
```

## Usage

```js
const getModuleType = require('module-definition');

// Async
getModuleType('myscript.js', (error, type) => {
  console.log(type);
});

// Sync
let type = getModuleType.sync('myscript.js');
console.log(type);

// From source (string or an AST)
type = getModuleType.fromSource('define({foo: "foo"});');
console.log(type);
```

Passes one of the following strings to the given callback or returns the string in sync API:

* amd
* commonjs
* es6
* none

You may also pass an AST to `fromSource` to avoid an internal parsing of the source.

When specifying a filename, using the sync or async API, you can also provide an `options` object with an alternative `fs` implementation used to read the source file with.

```js
const myFs = GetFs();
const options = { fileSystem: myFs };

// Async
getModuleType('myscript.js', (error, type) => {
  console.log(type);
}, options);

// Sync
const type = getModuleType.sync('myscript.js', options);
```

## CLI

*Assumes a global install module-definition with `npm install -g module-definition`*

```sh
module-definition filename
```

### License

[MIT](LICENSE)
