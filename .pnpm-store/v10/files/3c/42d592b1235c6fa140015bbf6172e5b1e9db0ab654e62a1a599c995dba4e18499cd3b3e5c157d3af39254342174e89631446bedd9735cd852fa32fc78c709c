# is-arguments <sup>[![Version Badge][npm-version-svg]][package-url]</sup>

[![github actions][actions-image]][actions-url]
[![coverage][codecov-image]][codecov-url]
[![dependency status][deps-svg]][deps-url]
[![dev dependency status][dev-deps-svg]][dev-deps-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

[![npm badge][npm-badge-png]][package-url]

Is this an arguments object? It's a harder question than you think.

## Example

```js
var isArguments = require('is-arguments');
var assert = require('assert');

assert.equal(isArguments({}), false);
assert.equal(isArguments([]), false);
(function () {
	assert.equal(isArguments(arguments), true);
}())
```

## Caveats
If you have modified an actual `arguments` object by giving it a `Symbol.toStringTag` property, then this package will return `false`.

## Tests
Simply clone the repo, `npm install`, and run `npm test`

[package-url]: https://npmjs.org/package/is-arguments
[npm-version-svg]: https://versionbadg.es/inspect-js/is-arguments.svg
[deps-svg]: https://david-dm.org/inspect-js/is-arguments.svg
[deps-url]: https://david-dm.org/inspect-js/is-arguments
[dev-deps-svg]: https://david-dm.org/inspect-js/is-arguments/dev-status.svg
[dev-deps-url]: https://david-dm.org/inspect-js/is-arguments#info=devDependencies
[npm-badge-png]: https://nodei.co/npm/is-arguments.png?downloads=true&stars=true
[license-image]: https://img.shields.io/npm/l/is-arguments.svg
[license-url]: LICENSE
[downloads-image]: https://img.shields.io/npm/dm/is-arguments.svg
[downloads-url]: https://npm-stat.com/charts.html?package=is-arguments
[codecov-image]: https://codecov.io/gh/inspect-js/is-arguments/branch/main/graphs/badge.svg
[codecov-url]: https://app.codecov.io/gh/inspect-js/is-arguments/
[actions-image]: https://img.shields.io/endpoint?url=https://github-actions-badge-u3jn4tfpocch.runkit.sh/inspect-js/is-arguments
[actions-url]: https://github.com/inspect-js/is-arguments/actions
