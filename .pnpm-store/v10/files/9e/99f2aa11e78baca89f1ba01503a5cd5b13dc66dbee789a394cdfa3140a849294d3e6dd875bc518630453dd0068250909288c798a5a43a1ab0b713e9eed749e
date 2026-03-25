# @npmcli/fs

polyfills, and extensions, of the core `fs` module.

## Features

- all exposed functions return promises
- `fs.rm` polyfill for node versions < 14.14.0
- `fs.mkdir` polyfill adding support for the `recursive` and `force` options in node versions < 10.12.0
- `fs.copyFile` extended to accept an `owner` option
- `fs.mkdir` extended to accept an `owner` option
- `fs.mkdtemp` extended to accept an `owner` option
- `fs.writeFile` extended to accept an `owner` option
- `fs.withTempDir` added
- `fs.cp` polyfill for node < 16.7.0

## The `owner` option

The `copyFile`, `mkdir`, `mkdtemp`, `writeFile`, and `withTempDir` functions
all accept a new `owner` property in their options. It can be used in two ways:

- `{ owner: { uid: 100, gid: 100 } }` - set the `uid` and `gid` explicitly
- `{ owner: 100 }` - use one value, will set both `uid` and `gid` the same

The special string `'inherit'` may be passed instead of a number, which will
cause this module to automatically determine the correct `uid` and/or `gid`
from the nearest existing parent directory of the target.

## `fs.withTempDir(root, fn, options) -> Promise`

### Parameters

- `root`: the directory in which to create the temporary directory
- `fn`: a function that will be called with the path to the temporary directory
- `options`
  - `tmpPrefix`: a prefix to be used in the generated directory name

### Usage

The `withTempDir` function creates a temporary directory, runs the provided
function (`fn`), then removes the temporary directory and resolves or rejects
based on the result of `fn`.

```js
const fs = require('@npmcli/fs')
const os = require('os')

// this function will be called with the full path to the temporary directory
// it is called with `await` behind the scenes, so can be async if desired.
const myFunction = async (tempPath) => {
  return 'done!'
}

const main = async () => {
  const result = await fs.withTempDir(os.tmpdir(), myFunction)
  // result === 'done!'
}

main()
```
