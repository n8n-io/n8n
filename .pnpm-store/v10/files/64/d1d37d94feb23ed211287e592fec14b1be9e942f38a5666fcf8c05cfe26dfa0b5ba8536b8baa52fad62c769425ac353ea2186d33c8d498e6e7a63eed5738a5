# deep-equal <sup>[![Version Badge][npm-version-svg]][package-url]</sup>

Node's `assert.deepEqual() algorithm` as a standalone module, that also works in browser environments.

It mirrors the robustness of node's own `assert.deepEqual` and is robust against later builtin modification.

[![github actions][actions-image]][actions-url]
[![coverage][codecov-image]][codecov-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

[![npm badge][npm-badge-png]][package-url]

# example

``` js
var equal = require('deep-equal');
console.dir([
    equal(
        { a : [ 2, 3 ], b : [ 4 ] },
        { a : [ 2, 3 ], b : [ 4 ] }
    ),
    equal(
        { x : 5, y : [6] },
        { x : 5, y : 6 }
    )
]);
```

# methods

``` js
var deepEqual = require('deep-equal')
```

## deepEqual(a, b, opts)

Compare objects `a` and `b`, returning whether they are equal according to a recursive equality algorithm.

If `opts.strict` is `true`, use strict equality (`===`) to compare leaf nodes.
The default is to use coercive equality (`==`) because that's how `assert.deepEqual()` works by default.

# install

With [npm](https://npmjs.org) do:

```
npm install deep-equal
```

# test

With [npm](https://npmjs.org) do:

```
npm test
```

[package-url]: https://npmjs.org/package/deep-equal
[npm-version-svg]: https://versionbadg.es/inspect-js/deep-equal.svg
[deps-svg]: https://david-dm.org/inspect-js/node-deep-equal.svg
[deps-url]: https://david-dm.org/inspect-js/node-deep-equal
[dev-deps-svg]: https://david-dm.org/inspect-js/node-deep-equal/dev-status.svg
[dev-deps-url]: https://david-dm.org/inspect-js/node-deep-equal#info=devDependencies
[npm-badge-png]: https://nodei.co/npm/deep-equal.png?downloads=true&stars=true
[license-image]: https://img.shields.io/npm/l/deep-equal.svg
[license-url]: LICENSE
[downloads-image]: https://img.shields.io/npm/dm/deep-equal.svg
[downloads-url]: https://npm-stat.com/charts.html?package=deep-equal
[codecov-image]: https://codecov.io/gh/inspect-js/node-deep-equal/branch/main/graphs/badge.svg
[codecov-url]: https://app.codecov.io/gh/inspect-js/node-deep-equal/
[actions-image]: https://img.shields.io/endpoint?url=https://github-actions-badge-u3jn4tfpocch.runkit.sh/inspect-js/node-deep-equal
[actions-url]: https://github.com/inspect-js/node-deep-equal/actions
