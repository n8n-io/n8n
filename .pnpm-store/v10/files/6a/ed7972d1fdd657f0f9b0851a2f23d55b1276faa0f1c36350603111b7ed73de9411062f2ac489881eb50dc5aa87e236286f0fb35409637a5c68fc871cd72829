
# thenify-all

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Dependency Status][david-image]][david-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]
[![Gittip][gittip-image]][gittip-url]

Promisifies all the selected functions in an object.

```js
var thenifyAll = require('thenify-all');

var fs = thenifyAll(require('fs'), {}, [
  'readFile',
  'writeFile',
]);

fs.readFile(__filename).then(function (buffer) {
  console.log(buffer.toString());
});
```

## API

### var obj = thenifyAll(source, [obj], [methods])

Promisifies all the selected functions in an object.

- `source` - the source object for the async functions
- `obj` - the destination to set all the promisified methods
- `methods` - an array of method names of `source`

### var obj = thenifyAll.withCallback(source, [obj], [methods])

Promisifies all the selected functions in an object and backward compatible with callback.

- `source` - the source object for the async functions
- `obj` - the destination to set all the promisified methods
- `methods` - an array of method names of `source`

### thenifyAll.thenify

Exports [thenify](https://github.com/thenables/thenify) this package uses.

[gitter-image]: https://badges.gitter.im/thenables/thenify-all.png
[gitter-url]: https://gitter.im/thenables/thenify-all
[npm-image]: https://img.shields.io/npm/v/thenify-all.svg?style=flat-square
[npm-url]: https://npmjs.org/package/thenify-all
[github-tag]: http://img.shields.io/github/tag/thenables/thenify-all.svg?style=flat-square
[github-url]: https://github.com/thenables/thenify-all/tags
[travis-image]: https://img.shields.io/travis/thenables/thenify-all.svg?style=flat-square
[travis-url]: https://travis-ci.org/thenables/thenify-all
[coveralls-image]: https://img.shields.io/coveralls/thenables/thenify-all.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/thenables/thenify-all
[david-image]: http://img.shields.io/david/thenables/thenify-all.svg?style=flat-square
[david-url]: https://david-dm.org/thenables/thenify-all
[license-image]: http://img.shields.io/npm/l/thenify-all.svg?style=flat-square
[license-url]: LICENSE
[downloads-image]: http://img.shields.io/npm/dm/thenify-all.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/thenify-all
[gittip-image]: https://img.shields.io/gratipay/jonathanong.svg?style=flat-square
[gittip-url]: https://gratipay.com/jonathanong/
