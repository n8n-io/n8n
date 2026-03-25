# with

Compile time `with` for strict mode JavaScript

[![Build Status](https://img.shields.io/github/workflow/status/pugjs/with/Publish%20Canary/master?style=for-the-badge)](https://github.com/pugjs/with/actions?query=workflow%3A%22Publish+Canary%22)
[![Rolling Versions](https://img.shields.io/badge/Rolling%20Versions-Enabled-brightgreen?style=for-the-badge)](https://rollingversions.com/pugjs/with)
[![NPM version](https://img.shields.io/npm/v/with?style=for-the-badge)](https://www.npmjs.com/package/with)

## Installation

    $ npm install with

## Usage

```js
var addWith = require('with');

addWith('obj', 'console.log(a)');
// => ';(function (console, a) {
//       console.log(a)
//     }("console" in obj ? obj.console :
//                          typeof console!=="undefined" ? console : undefined,
//       "a" in obj ? obj.a :
//                    typeof a !== "undefined" ? a : undefined));'

addWith('obj', 'console.log(a)', ['console']);
// => ';(function (console, a) {
//       console.log(a)
//     }("a" in obj ? obj.a :
//                    typeof a !== "undefined" ? a : undefined));'
```

## API

### addWith(obj, src[, exclude])

The idea is that this is roughly equivallent to:

```js
with (obj) {
  src;
}
```

There are a few differences though. For starters, assignments to variables will always remain contained within the with block.

e.g.

```js
var foo = 'foo';
with ({}) {
  foo = 'bar';
}
assert(foo === 'bar'); // => This fails for compile time with but passes for native with

var obj = {foo: 'foo'};
with ({}) {
  foo = 'bar';
}
assert(obj.foo === 'bar'); // => This fails for compile time with but passes for native with
```

It also makes everything be declared, so you can always do:

```js
if (foo === undefined)
```

instead of

```js
if (typeof foo === 'undefined')
```

This is not the case if foo is in `exclude`. If a variable is excluded, we ignore it entirely. This is useful if you know a variable will be global as it can lead to efficiency improvements.

It is also safe to use in strict mode (unlike `with`) and it minifies properly (`with` disables virtually all minification).

#### Parsing Errors

with internally uses babylon to parse code passed to `addWith`. If babylon throws an error, probably due to a syntax error, `addWith` returns an error wrapping the babylon error, so you can
retrieve location information. `error.component` is `"src"` if the error is in the body or `"obj"` if it's in the object part of the with expression. `error.babylonError` is
the error thrown from babylon.

## License

MIT
