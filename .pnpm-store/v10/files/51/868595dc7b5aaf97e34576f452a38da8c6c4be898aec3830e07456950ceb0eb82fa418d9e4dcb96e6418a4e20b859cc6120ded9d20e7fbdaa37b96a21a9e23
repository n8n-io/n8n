# package-hash

Generates a hash for an installed npm package, useful for salting caches.
[AVA](https://github.com/sindresorhus/ava) for example caches precompiled test
files. It generates a salt for its cache based on the various packages that are
used when compiling the test files.

`package-hash` can generate an appropriate hash based on the package location
(on disk) and the `package.json` file. This hash is salted with a hash
for the `package-hash` itself.

`package-hash` can detect when the package-to-be-hashed is a Git repository. In
the AVA example this is useful when you're debugging one of the packages used to
compile the test files. You can clone it locally and use `npm link` so AVA can
find the clone. The hash will include the HEAD (`.git/HEAD`) and its
corresponding ref (e.g. `.git/refs/heads/master`), any packed refs
(`.git/packed-refs`), as well as the diff (`git diff`) for any non-committed
changes. This makes it really easy to test your changes without having to
explicitly clear the cache in the parent project.

## Installation

```console
$ npm install --save package-hash
```

## Usage

```js
const packageHash = require('package-hash')

// Asynchronously:
const hash = await packageHash(require.resolve('babel-core/package.json'))

// Synchronously:
const hash = packageHash.sync(require.resolve('babel-core/package.json'))
```

`packageHash()` / `packageHash.sync()` must be called with a file path for an
existing `package.json` file. To get the path to an npm package it's easiest to
use `require.resolve('the-name/package.json')`.

You can provide multiple paths:

```js
const hash = await packageHash([
  require.resolve('babel-core/package.json'),
  require.resolve('babel-preset-es2015/package.json')
])
```

An optional salt value can also be provided:

```js
const hash = await packageHash(require.resolve('babel-core/package.json'), 'salt value')
```

## API

### `packageHash(paths, salt?)`

`paths: string | string[]` ➜ can be a single file path, or an array of paths.

`salt: Array | Buffer | Object | string` ➜ optional. If an `Array` or `Object` (not `null`) it is first converted to a JSON string.

Returns a promise for the hex-encoded hash string.

### `packageHash.sync(paths, salt?)`

`paths: string | string[]` ➜ can be a single file path, or an array of paths.

`salt: Array | Buffer | Object | string` ➜ optional. If an `Array` or `Object` (not `null`) it is first converted to a JSON string.

Returns a hex-encoded hash string.

## Compatibility

`package-hash` has been tested with Node.js 8 and above, including Windows
support.
