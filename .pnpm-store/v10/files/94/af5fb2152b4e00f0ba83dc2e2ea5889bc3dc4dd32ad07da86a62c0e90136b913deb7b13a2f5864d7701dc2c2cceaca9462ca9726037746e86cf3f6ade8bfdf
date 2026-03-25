# camelize <sup>[![Version Badge][npm-version-svg]][package-url]</sup>

[![github actions][actions-image]][actions-url]
[![coverage][codecov-image]][codecov-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

[![npm badge][npm-badge-png]][package-url]

recursively transform key strings to camel-case

# example

``` js
var camelize = require('camelize');
var obj = {
    fee_fie_foe: 'fum',
    beep_boop: [
        { 'abc.xyz': 'mno' },
        { 'foo-bar': 'baz' }
    ]
};
var res = camelize(obj);
console.log(JSON.stringify(res, null, 2));
```

output:

```
{
  "feeFieFoe": "fum",
  "beepBoop": [
    {
      "abcXyz": "mno"
    },
    {
      "fooBar": "baz"
    }
  ]
}
```

# methods

``` js
var camelize = require('camelize')
```

## camelize(obj)

Convert the key strings in `obj` to camel-case recursively.

# install

With [npm](https://npmjs.org) do:

```
npm install camelize
```

To use in the browser, use [browserify](http://browserify.org).

# license

MIT

[package-url]: https://npmjs.org/package/camelize
[npm-version-svg]: https://versionbadg.es/ljharb/camelize.svg
[deps-svg]: https://david-dm.org/ljharb/camelize.svg
[deps-url]: https://david-dm.org/ljharb/camelize
[dev-deps-svg]: https://david-dm.org/ljharb/camelize/dev-status.svg
[dev-deps-url]: https://david-dm.org/ljharb/camelize#info=devDependencies
[npm-badge-png]: https://nodei.co/npm/camelize.png?downloads=true&stars=true
[license-image]: https://img.shields.io/npm/l/camelize.svg
[license-url]: LICENSE
[downloads-image]: https://img.shields.io/npm/dm/camelize.svg
[downloads-url]: https://npm-stat.com/charts.html?package=camelize
[codecov-image]: https://codecov.io/gh/ljharb/camelize/branch/main/graphs/badge.svg
[codecov-url]: https://app.codecov.io/gh/ljharb/camelize/
[actions-image]: https://img.shields.io/endpoint?url=https://github-actions-badge-u3jn4tfpocch.runkit.sh/ljharb/camelize
[actions-url]: https://github.com/ljharb/camelize/actions
