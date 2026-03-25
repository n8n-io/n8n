
# MZ - Modernize node.js

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Dependency Status][david-image]][david-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

Modernize node.js to current ECMAScript specifications!
node.js will not update their API to ES6+ [for a while](https://github.com/joyent/node/issues/7549).
This library is a wrapper for various aspects of node.js' API.

## Installation and Usage

Set `mz` as a dependency and install it.

```bash
npm i mz
```

Then prefix the relevant `require()`s with `mz/`:

```js
var fs = require('mz/fs')

fs.exists(__filename).then(function (exists) {
  if (exists) // do something
})
```

With ES2017, this will allow you to use async functions cleanly with node's core API:

```js
const fs = require('mz/fs')


async function doSomething () {
  if (await fs.exists(__filename)) // do something
}
```

## Promisification

Many node methods are converted into promises.
Any properties that are deprecated or aren't asynchronous will simply be proxied.
The modules wrapped are:

- `child_process`
- `crypto`
- `dns`
- `fs` (uses `graceful-fs` if available)
- `readline`
- `zlib`

```js
var exec = require('mz/child_process').exec

exec('node --version').then(function (stdout) {
  console.log(stdout)
})
```

## Promise Engine

`mz` uses [`any-promise`](https://github.com/kevinbeaty/any-promise).

## FAQ

### Can I use this in production?

Yes, Node 4.x ships with stable promises support. For older engines,
you should probably install your own promise implementation and register it with
`require('any-promise/register')('bluebird')`.

### Will this make my app faster?

Nope, probably slower actually.

### Can I add more features?

Sure.
Open an issue.

Currently, the plans are to eventually support:

- New APIs in node.js that are not available in older versions of node
- ECMAScript7 Streams

[bluebird]: https://github.com/petkaantonov/bluebird

[npm-image]: https://img.shields.io/npm/v/mz.svg?style=flat-square
[npm-url]: https://npmjs.org/package/mz
[github-tag]: http://img.shields.io/github/tag/normalize/mz.svg?style=flat-square
[github-url]: https://github.com/normalize/mz/tags
[travis-image]: https://img.shields.io/travis/normalize/mz.svg?style=flat-square
[travis-url]: https://travis-ci.org/normalize/mz
[coveralls-image]: https://img.shields.io/coveralls/normalize/mz.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/normalize/mz?branch=master
[david-image]: http://img.shields.io/david/normalize/mz.svg?style=flat-square
[david-url]: https://david-dm.org/normalize/mz
[license-image]: http://img.shields.io/npm/l/mz.svg?style=flat-square
[license-url]: LICENSE
[downloads-image]: http://img.shields.io/npm/dm/mz.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/mz
