# mkdirp

Like `mkdir -p`, but in Node.js!

Now with a modern API and no\* bugs!

<small>\* may contain some bugs</small>

# example

## pow.js

```js
const mkdirp = require('mkdirp')

// return value is a Promise resolving to the first directory created
mkdirp('/tmp/foo/bar/baz').then(made =>
  console.log(`made directories, starting with ${made}`))
```

Output (where `/tmp/foo` already exists)

```
made directories, starting with /tmp/foo/bar
```

Or, if you don't have time to wait around for promises:

```js
const mkdirp = require('mkdirp')

// return value is the first directory created
const made = mkdirp.sync('/tmp/foo/bar/baz')
console.log(`made directories, starting with ${made}`)
```

And now /tmp/foo/bar/baz exists, huzzah!

# methods

```js
const mkdirp = require('mkdirp')
```

## mkdirp(dir, [opts]) -> Promise<String | undefined>

Create a new directory and any necessary subdirectories at `dir` with octal
permission string `opts.mode`. If `opts` is a string or number, it will be
treated as the `opts.mode`.

If `opts.mode` isn't specified, it defaults to `0o777 &
(~process.umask())`.

Promise resolves to first directory `made` that had to be created, or
`undefined` if everything already exists.  Promise rejects if any errors
are encountered.  Note that, in the case of promise rejection, some
directories _may_ have been created, as recursive directory creation is not
an atomic operation.

You can optionally pass in an alternate `fs` implementation by passing in
`opts.fs`. Your implementation should have `opts.fs.mkdir(path, opts, cb)`
and `opts.fs.stat(path, cb)`.

You can also override just one or the other of `mkdir` and `stat` by
passing in `opts.stat` or `opts.mkdir`, or providing an `fs` option that
only overrides one of these.

## mkdirp.sync(dir, opts) -> String|null

Synchronously create a new directory and any necessary subdirectories at
`dir` with octal permission string `opts.mode`. If `opts` is a string or
number, it will be treated as the `opts.mode`.

If `opts.mode` isn't specified, it defaults to `0o777 &
(~process.umask())`.

Returns the first directory that had to be created, or undefined if
everything already exists.

You can optionally pass in an alternate `fs` implementation by passing in
`opts.fs`. Your implementation should have `opts.fs.mkdirSync(path, mode)`
and `opts.fs.statSync(path)`.

You can also override just one or the other of `mkdirSync` and `statSync`
by passing in `opts.statSync` or `opts.mkdirSync`, or providing an `fs`
option that only overrides one of these.

## mkdirp.manual, mkdirp.manualSync

Use the manual implementation (not the native one).  This is the default
when the native implementation is not available or the stat/mkdir
implementation is overridden.

## mkdirp.native, mkdirp.nativeSync

Use the native implementation (not the manual one).  This is the default
when the native implementation is available and stat/mkdir are not
overridden.

# implementation

On Node.js v10.12.0 and above, use the native `fs.mkdir(p,
{recursive:true})` option, unless `fs.mkdir`/`fs.mkdirSync` has been
overridden by an option.

## native implementation

- If the path is a root directory, then pass it to the underlying
  implementation and return the result/error.  (In this case, it'll either
  succeed or fail, but we aren't actually creating any dirs.)
- Walk up the path statting each directory, to find the first path that
  will be created, `made`.
- Call `fs.mkdir(path, { recursive: true })` (or `fs.mkdirSync`)
- If error, raise it to the caller.
- Return `made`.

## manual implementation

- Call underlying `fs.mkdir` implementation, with `recursive: false`
- If error:
  - If path is a root directory, raise to the caller and do not handle it
  - If ENOENT, mkdirp parent dir, store result as `made`
  - stat(path)
    - If error, raise original `mkdir` error
    - If directory, return `made`
    - Else, raise original `mkdir` error
- else
  - return `undefined` if a root dir, or `made` if set, or `path`

## windows vs unix caveat

On Windows file systems, attempts to create a root directory (ie, a drive
letter or root UNC path) will fail.  If the root directory exists, then it
will fail with `EPERM`.  If the root directory does not exist, then it will
fail with `ENOENT`.

On posix file systems, attempts to create a root directory (in recursive
mode) will succeed silently, as it is treated like just another directory
that already exists.  (In non-recursive mode, of course, it fails with
`EEXIST`.)

In order to preserve this system-specific behavior (and because it's not as
if we can create the parent of a root directory anyway), attempts to create
a root directory are passed directly to the `fs` implementation, and any
errors encountered are not handled.

## native error caveat

The native implementation (as of at least Node.js v13.4.0) does not provide
appropriate errors in some cases (see
[nodejs/node#31481](https://github.com/nodejs/node/issues/31481) and
[nodejs/node#28015](https://github.com/nodejs/node/issues/28015)).

In order to work around this issue, the native implementation will fall
back to the manual implementation if an `ENOENT` error is encountered.

# choosing a recursive mkdir implementation

There are a few to choose from!  Use the one that suits your needs best :D

## use `fs.mkdir(path, {recursive: true}, cb)` if:

- You wish to optimize performance even at the expense of other factors.
- You don't need to know the first dir created.
- You are ok with getting `ENOENT` as the error when some other problem is
  the actual cause.
- You can limit your platforms to Node.js v10.12 and above.
- You're ok with using callbacks instead of promises.
- You don't need/want a CLI.
- You don't need to override the `fs` methods in use.

## use this module (mkdirp 1.x) if:

- You need to know the first directory that was created.
- You wish to use the native implementation if available, but fall back
  when it's not.
- You prefer promise-returning APIs to callback-taking APIs.
- You want more useful error messages than the native recursive mkdir
  provides (at least as of Node.js v13.4), and are ok with re-trying on
  `ENOENT` to achieve this.
- You need (or at least, are ok with) a CLI.
- You need to override the `fs` methods in use.

## use [`make-dir`](http://npm.im/make-dir) if:

- You do not need to know the first dir created (and wish to save a few
  `stat` calls when using the native implementation for this reason).
- You wish to use the native implementation if available, but fall back
  when it's not.
- You prefer promise-returning APIs to callback-taking APIs.
- You are ok with occasionally getting `ENOENT` errors for failures that
  are actually related to something other than a missing file system entry.
- You don't need/want a CLI.
- You need to override the `fs` methods in use.

## use mkdirp 0.x if:

- You need to know the first directory that was created.
- You need (or at least, are ok with) a CLI.
- You need to override the `fs` methods in use.
- You're ok with using callbacks instead of promises.
- You are not running on Windows, where the root-level ENOENT errors can
  lead to infinite regress.
- You think vinyl just sounds warmer and richer for some weird reason.
- You are supporting truly ancient Node.js versions, before even the advent
  of a `Promise` language primitive.  (Please don't.  You deserve better.)

# cli

This package also ships with a `mkdirp` command.

```
$ mkdirp -h

usage: mkdirp [DIR1,DIR2..] {OPTIONS}

  Create each supplied directory including any necessary parent directories
  that don't yet exist.

  If the directory already exists, do nothing.

OPTIONS are:

  -m<mode>       If a directory needs to be created, set the mode as an octal
  --mode=<mode>  permission string.

  -v --version   Print the mkdirp version number

  -h --help      Print this helpful banner

  -p --print     Print the first directories created for each path provided

  --manual       Use manual implementation, even if native is available
```

# install

With [npm](http://npmjs.org) do:

```
npm install mkdirp
```

to get the library locally, or

```
npm install -g mkdirp
```

to get the command everywhere, or

```
npx mkdirp ...
```

to run the command without installing it globally.

# platform support

This module works on node v8, but only v10 and above are officially
supported, as Node v8 reached its LTS end of life 2020-01-01, which is in
the past, as of this writing.

# license

MIT
