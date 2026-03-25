# async-function <sup>[![Version Badge][npm-version-svg]][package-url]</sup>

[![github actions][actions-image]][actions-url]
[![coverage][codecov-image]][codecov-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

[![npm badge][npm-badge-png]][package-url]

A function that returns the normally hidden `AsyncFunction` constructor, when available.

## Getting started

```sh
npm install --save async-function
```

## Usage/Examples

```js
const assert = require('assert');
const AsyncFunction = require('async-function')();

const fn = new AsyncFunction('return 1');

assert.equal(fn.toString(), 'async function anonymous(\n) {\nreturn 1\n}');

fn().then(x => {
    assert.equal(x, 1);
});
```

## Tests

Clone the repo, `npm install`, and run `npm test`

[package-url]: https://npmjs.org/package/async-function
[npm-version-svg]: https://versionbadg.es/ljharb/async-function.svg
[deps-svg]: https://david-dm.org/ljharb/async-function.svg
[deps-url]: https://david-dm.org/ljharb/async-function
[dev-deps-svg]: https://david-dm.org/ljharb/async-function/dev-status.svg
[dev-deps-url]: https://david-dm.org/ljharb/async-function#info=devDependencies
[npm-badge-png]: https://nodei.co/npm/async-function.png?downloads=true&stars=true
[license-image]: https://img.shields.io/npm/l/async-function.svg
[license-url]: LICENSE
[downloads-image]: https://img.shields.io/npm/dm/async-function.svg
[downloads-url]: https://npm-stat.com/charts.html?package=async-function
[codecov-image]: https://codecov.io/gh/ljharb/async-function/branch/main/graphs/badge.svg
[codecov-url]: https://app.codecov.io/gh/ljharb/async-function/
[actions-image]: https://img.shields.io/endpoint?url=https://github-actions-badge-u3jn4tfpocch.runkit.sh/ljharb/async-function
[actions-url]: https://github.com/ljharb/async-function/actions
