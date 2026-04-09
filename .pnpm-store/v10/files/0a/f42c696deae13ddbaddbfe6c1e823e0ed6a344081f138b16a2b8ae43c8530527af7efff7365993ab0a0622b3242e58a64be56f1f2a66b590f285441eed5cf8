The [UNIX command](<http://en.wikipedia.org/wiki/Rm_(Unix)>) `rm -rf` for node
in a cross-platform implementation.

Install with `npm install rimraf`.

## Major Changes

### v4 to v5

- There is no default export anymore. Import the functions directly
  using, e.g., `import { rimrafSync } from 'rimraf'`.

### v3 to v4

- The function returns a `Promise` instead of taking a callback.
- Globbing requires the `--glob` CLI option or `glob` option property
  to be set. (Removed in 4.0 and 4.1, opt-in support added in 4.2.)
- Functions take arrays of paths, as well as a single path.
- Native implementation used by default when available, except on
  Windows, where this implementation is faster and more reliable.
- New implementation on Windows, falling back to "move then
  remove" strategy when exponential backoff for `EBUSY` fails to
  resolve the situation.
- Simplified implementation on POSIX, since the Windows
  affordances are not necessary there.
- As of 4.3, return/resolve value is boolean instead of undefined.

## API

Hybrid module, load either with `import` or `require()`.

```js
// 'rimraf' export is the one you probably want, but other
// strategies exported as well.
import { rimraf, rimrafSync, native, nativeSync } from 'rimraf'
// or
const { rimraf, rimrafSync, native, nativeSync } = require('rimraf')
```

All removal functions return a boolean indicating that all
entries were successfully removed.

The only case in which this will not return `true` is if
something was omitted from the removal via a `filter` option.

### `rimraf(f, [opts]) -> Promise`

This first parameter is a path or array of paths. The second
argument is an options object.

Options:

- `preserveRoot`: If set to boolean `false`, then allow the
  recursive removal of the root directory. Otherwise, this is
  not allowed.
- `tmp`: Windows only. Temp folder to place files and
  folders for the "move then remove" fallback. Must be on the
  same physical device as the path being deleted. Defaults to
  `os.tmpdir()` when that is on the same drive letter as the path
  being deleted, or `${drive}:\temp` if present, or `${drive}:\`
  if not.
- `maxRetries`: Windows and Native only. Maximum number of
  retry attempts in case of `EBUSY`, `EMFILE`, and `ENFILE`
  errors. Default `10` for Windows implementation, `0` for Native
  implementation.
- `backoff`: Windows only. Rate of exponential backoff for async
  removal in case of `EBUSY`, `EMFILE`, and `ENFILE` errors.
  Should be a number greater than 1. Default `1.2`
- `maxBackoff`: Windows only. Maximum total backoff time in ms to
  attempt asynchronous retries in case of `EBUSY`, `EMFILE`, and
  `ENFILE` errors. Default `200`. With the default `1.2` backoff
  rate, this results in 14 retries, with the final retry being
  delayed 33ms.
- `retryDelay`: Native only. Time to wait between retries, using
  linear backoff. Default `100`.
- `signal` Pass in an AbortSignal to cancel the directory
  removal. This is useful when removing large folder structures,
  if you'd like to limit the time spent.

  Using a `signal` option prevents the use of Node's built-in
  `fs.rm` because that implementation does not support abort
  signals.

- `glob` Boolean flag to treat path as glob pattern, or an object
  specifying [`glob` options](https://github.com/isaacs/node-glob).
- `filter` Method that returns a boolean indicating whether that
  path should be deleted. With async `rimraf` methods, this may
  return a Promise that resolves to a boolean. (Since Promises
  are truthy, returning a Promise from a sync filter is the same
  as just not filtering anything.)

  The first argument to the filter is the path string. The
  second argument is either a `Dirent` or `Stats` object for that
  path. (The first path explored will be a `Stats`, the rest
  will be `Dirent`.)

  If a filter method is provided, it will _only_ remove entries
  if the filter returns (or resolves to) a truthy value. Omitting
  a directory will still allow its children to be removed, unless
  they are also filtered out, but any parents of a filtered entry
  will not be removed, since the directory will not be empty in
  that case.

  Using a filter method prevents the use of Node's built-in
  `fs.rm` because that implementation does not support filtering.

Any other options are provided to the native Node.js `fs.rm` implementation
when that is used.

This will attempt to choose the best implementation, based on the Node.js
version and `process.platform`. To force a specific implementation, use
one of the other functions provided.

### `rimraf.sync(f, [opts])` <br> `rimraf.rimrafSync(f, [opts])`

Synchronous form of `rimraf()`

Note that, unlike many file system operations, the synchronous form will
typically be significantly _slower_ than the async form, because recursive
deletion is extremely parallelizable.

### `rimraf.native(f, [opts])`

Uses the built-in `fs.rm` implementation that Node.js provides. This is
used by default on Node.js versions greater than or equal to `14.14.0`.

### `rimraf.native.sync(f, [opts])` <br> `rimraf.nativeSync(f, [opts])`

Synchronous form of `rimraf.native`

### `rimraf.manual(f, [opts])`

Use the JavaScript implementation appropriate for your operating system.

### `rimraf.manual.sync(f, [opts])` <br> `rimraf.manualSync(f, opts)`

Synchronous form of `rimraf.manual()`

### `rimraf.windows(f, [opts])`

JavaScript implementation of file removal appropriate for Windows
platforms. Works around `unlink` and `rmdir` not being atomic
operations, and `EPERM` when deleting files with certain
permission modes.

First deletes all non-directory files within the tree, and then
removes all directories, which should ideally be empty by that
time. When an `ENOTEMPTY` is raised in the second pass, falls
back to the `rimraf.moveRemove` strategy as needed.

### `rimraf.windows.sync(path, [opts])` <br> `rimraf.windowsSync(path, [opts])`

Synchronous form of `rimraf.windows()`

### `rimraf.moveRemove(path, [opts])`

Moves all files and folders to the parent directory of `path`
with a temporary filename prior to attempting to remove them.

Note that, in cases where the operation fails, this _may_ leave
files lying around in the parent directory with names like
`.file-basename.txt.0.123412341`. Until the Windows kernel
provides a way to perform atomic `unlink` and `rmdir` operations,
this is, unfortunately, unavoidable.

To move files to a different temporary directory other than the
parent, provide `opts.tmp`. Note that this _must_ be on the same
physical device as the folder being deleted, or else the
operation will fail.

This is the slowest strategy, but most reliable on Windows
platforms. Used as a last-ditch fallback by `rimraf.windows()`.

### `rimraf.moveRemove.sync(path, [opts])` <br> `rimraf.moveRemoveSync(path, [opts])`

Synchronous form of `rimraf.moveRemove()`

### Command Line Interface

```
rimraf version 4.3.0

Usage: rimraf <path> [<path> ...]
Deletes all files and folders at "path", recursively.

Options:
  --                   Treat all subsequent arguments as paths
  -h --help            Display this usage info
  --preserve-root      Do not remove '/' recursively (default)
  --no-preserve-root   Do not treat '/' specially
  -G --no-glob         Treat arguments as literal paths, not globs (default)
  -g --glob            Treat arguments as glob patterns
  -v --verbose         Be verbose when deleting files, showing them as
                       they are removed. Not compatible with --impl=native
  -V --no-verbose      Be silent when deleting files, showing nothing as
                       they are removed (default)
  -i --interactive     Ask for confirmation before deleting anything
                       Not compatible with --impl=native
  -I --no-interactive  Do not ask for confirmation before deleting

  --impl=<type>        Specify the implementation to use:
                       rimraf: choose the best option (default)
                       native: the built-in implementation in Node.js
                       manual: the platform-specific JS implementation
                       posix: the Posix JS implementation
                       windows: the Windows JS implementation (falls back to
                                move-remove on ENOTEMPTY)
                       move-remove: a slow reliable Windows fallback

Implementation-specific options:
  --tmp=<path>        Temp file folder for 'move-remove' implementation
  --max-retries=<n>   maxRetries for 'native' and 'windows' implementations
  --retry-delay=<n>   retryDelay for 'native' implementation, default 100
  --backoff=<n>       Exponential backoff factor for retries (default: 1.2)
```

## mkdirp

If you need to _create_ a directory recursively, check out
[mkdirp](https://github.com/isaacs/node-mkdirp).
