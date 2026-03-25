# isexe

Minimal module to check if a file is executable, and a normal file.

Uses `fs.stat` and tests against the `PATHEXT` environment variable on
Windows.

## USAGE

```js
import { isexe, sync } from 'isexe'
// or require() works too
// const { isexe } = require('isexe')
isexe('some-file-name').then(isExe => {
  if (isExe) {
    console.error('this thing can be run')
  } else {
    console.error('cannot be run')
  }
}, (err) => {
  console.error('probably file doesnt exist or something')
})

// same thing but synchronous, throws errors
isExe = sync('some-file-name')

// treat errors as just "not executable"
const isExe = await isexe('maybe-missing-file', { ignoreErrors: true })
const isExe = sync('maybe-missing-file', { ignoreErrors: true })
```

## API

### `isexe(path, [options]) => Promise<boolean>`

Check if the path is executable.

Will raise whatever errors may be raised by `fs.stat`, unless
`options.ignoreErrors` is set to true.

### `sync(path, [options]) => boolean`

Same as `isexe` but returns the value and throws any errors raised.

## Platform Specific Implementations

If for some reason you want to use the implementation for a
specific platform, you can do that.

```js
import { win32, posix } from 'isexe'
win32.isexe(...)
win32.sync(...)
// etc

// or:
import { isexe, sync } from 'isexe/posix'
```

The default exported implementation will be chosen based on
`process.platform`.

### Options

```ts
import type IsexeOptions from 'isexe'
```

* `ignoreErrors` Treat all errors as "no, this is not
  executable", but don't raise them.
* `uid` Number to use as the user id on posix
* `gid` Number to use as the group id on posix
* `pathExt` List of path extensions to use instead of `PATHEXT`
  environment variable on Windows.
