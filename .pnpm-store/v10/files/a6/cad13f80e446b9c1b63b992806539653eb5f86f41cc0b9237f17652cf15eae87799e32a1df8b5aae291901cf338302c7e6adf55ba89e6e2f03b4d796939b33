# detective-amd

[![CI](https://img.shields.io/github/actions/workflow/status/dependents/node-detective-amd/ci.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/node-detective-amd/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/detective-amd?logo=npm&logoColor=fff)](https://www.npmjs.com/package/detective-amd)
[![npm downloads](https://img.shields.io/npm/dm/detective-amd)](https://www.npmjs.com/package/detective-amd)

Returns a list of dependencies for a given JavaScript file or AST using any of the AMD module syntaxes.

*Inspired by substack/node-detective but built for AMD.*

```sh
npm install detective-amd
```

* Supports JSX code via [node-source-walk](https://github.com/dependents/node-source-walk).

## Usage

Let's say we have the following file definitions:

```js

// a.js
define(['./b', './c'], function (b, c) {
  console.log(b, c);
});

// b.js
define({
  name: 'foo'
});

// c.js
define(function () {
  return 'bar';
});

```

Here's how you can grab the list of dependencies of `a.js` **synchronously**.

```js
const fs = require('fs');
const detective = require('detective-amd');

const srcA = fs.readFileSync('a.js', 'utf8');

// Pass in the source code or an AST (if you've already parsed the file)
console.log(detective(srcA)); // prints ['./b', './c']
```

You may also (optionally) configure the detective via a second object argument `detective(src, options)` that supports the following options:

* `skipLazyLoaded`: (Boolean) whether or not to omit inner requires in the list of extracted dependencies.
  * Note: this does not affect the REM form since those inner requires are not "lazily" fetched.

## Syntax Support

**Supports the 4 forms of AMD module syntax:**

* "named": `define('name', [deps], func)`
* "dependency list": `define([deps], func)`
* "factory": `define(func(require))`
* "no dependencies": `define({})`

**Extra forms:**

* "driver script" (or entry-point) syntax: `require([deps], func)`
* "REM" (or CommonJS-like) form: `define(function(require, exports, module) {})`.

Also handles dynamically loaded dependencies (ex: inner requires).

**Supports driver scripts**

You can also find the dependencies from a script that has a top-level require (an app initialization/driver/entry-point script):

```js
require([
  './a'
], function (a) {
  // My app will get booted up from here
});
```

**Expression-based requires**

If there's a require call that doesn't have a string literal but an expression, a string (escodegen-generated) representation will be returned.

For example, if `a.js` was of the "factory" form and contained a dynamic module name:

```js
// a.js

define(function (require) {
  // Assume str is some variable that gets set to a string dynamically
  // const str = ...

  const b = require('./' + str);
  const c = require('./c');

  console.log(b, c);
});
```

The dependency list will be: `[ '\'./\' + str', './c' ]`

* Even though that string representation isn't incredibly useful, it's still added to the list to represent/count that dependency

## License

[MIT](LICENSE)
