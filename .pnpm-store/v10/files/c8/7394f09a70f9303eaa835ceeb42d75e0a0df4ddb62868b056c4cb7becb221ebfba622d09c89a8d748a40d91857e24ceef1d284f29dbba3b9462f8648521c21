# is-string <sup>[![Version Badge][2]][1]</sup>

[![github actions][actions-image]][actions-url]
[![coverage][codecov-image]][codecov-url]
[![dependency status][5]][6]
[![dev dependency status][7]][8]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

[![npm badge][11]][1]

Is this value a JS String object or primitive? This module works cross-realm/iframe, and despite ES6 @@toStringTag.

## Example

```js
var isString = require('is-string');
var assert = require('assert');

assert.notOk(isString(undefined));
assert.notOk(isString(null));
assert.notOk(isString(false));
assert.notOk(isString(true));
assert.notOk(isString(function () {}));
assert.notOk(isString([]));
assert.notOk(isString({}));
assert.notOk(isString(/a/g));
assert.notOk(isString(new RegExp('a', 'g')));
assert.notOk(isString(new Date()));
assert.notOk(isString(42));
assert.notOk(isString(NaN));
assert.notOk(isString(Infinity));
assert.notOk(isString(new Number(42)));

assert.ok(isString('foo'));
assert.ok(isString(Object('foo')));
```

## Tests
Simply clone the repo, `npm install`, and run `npm test`

[1]: https://npmjs.org/package/is-string
[2]: https://versionbadg.es/inspect-js/is-string.svg
[5]: https://david-dm.org/inspect-js/is-string.svg
[6]: https://david-dm.org/inspect-js/is-string
[7]: https://david-dm.org/inspect-js/is-string/dev-status.svg
[8]: https://david-dm.org/inspect-js/is-string#info=devDependencies
[11]: https://nodei.co/npm/is-string.png?downloads=true&stars=true
[license-image]: https://img.shields.io/npm/l/is-string.svg
[license-url]: LICENSE
[downloads-image]: https://img.shields.io/npm/dm/is-string.svg
[downloads-url]: https://npm-stat.com/charts.html?package=is-string
[codecov-image]: https://codecov.io/gh/inspect-js/is-string/branch/main/graphs/badge.svg
[codecov-url]: https://app.codecov.io/gh/inspect-js/is-string/
[actions-image]: https://img.shields.io/endpoint?url=https://github-actions-badge-u3jn4tfpocch.runkit.sh/inspect-js/is-string
[actions-url]: https://github.com/inspect-js/is-string/actions
