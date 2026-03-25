# regexp.escape <sup>[![Version Badge][npm-version-svg]][package-url]</sup>

[![github actions][actions-image]][actions-url]
[![coverage][codecov-image]][codecov-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

[![npm badge][npm-badge-png]][package-url]

A robust & optimized ES3-compatible polyfill for [the `RegExp.escape` proposal](https://github.com/tc39/proposal-regex-escaping).

Use it to safely escape RegExp special tokens for use in `new RegExp`.

Use it as a standalone function, or call its `shim` method to install it as a polyfill.

## Example

```js
var escape = require('regexp.escape');
var assert = require('assert');

var str = 'hello. how are you?';
var regex = new RegExp('^' + escape(str) + '$');
assert.match(str, regex);
assert.doesNotMatch('hello, how are you!', regex);
```

## Tests
Simply clone the repo, `npm install`, and run `npm test`

[package-url]: https://npmjs.org/package/regexp.escape
[npm-version-svg]: https://versionbadg.es/es-shims/RegExp.escape.svg
[deps-svg]: https://david-dm.org/es-shims/RegExp.escape.svg
[deps-url]: https://david-dm.org/es-shims/RegExp.escape
[dev-deps-svg]: https://david-dm.org/es-shims/RegExp.escape/dev-status.svg
[dev-deps-url]: https://david-dm.org/es-shims/RegExp.escape#info=devDependencies
[npm-badge-png]: https://nodei.co/npm/regexp.escape.png?downloads=true&stars=true
[license-image]: https://img.shields.io/npm/l/regexp.escape.svg
[license-url]: LICENSE
[downloads-image]: https://img.shields.io/npm/dm/regexp.escape.svg
[downloads-url]: https://npm-stat.com/charts.html?package=regexp.escape
[codecov-image]: https://codecov.io/gh/es-shims/RegExp.escape/branch/main/graphs/badge.svg
[codecov-url]: https://app.codecov.io/gh/es-shims/RegExp.escape/
[actions-image]: https://img.shields.io/endpoint?url=https://github-actions-badge-u3jn4tfpocch.runkit.sh/es-shims/RegExp.escape
[actions-url]: https://github.com/es-shims/RegExp.escape/actions
