# foreground-child

[![Build Status](https://travis-ci.org/tapjs/foreground-child.svg)](https://travis-ci.org/tapjs/foreground-child) [![Build status](https://ci.appveyor.com/api/projects/status/kq9ylvx9fyr9khx0?svg=true)](https://ci.appveyor.com/project/isaacs/foreground-child)

Run a child as if it's the foreground process.  Give it stdio.  Exit
when it exits.

Mostly this module is here to support some use cases around wrapping
child processes for test coverage and such.

## USAGE

```js
var foreground = require('foreground-child')

// cats out this file
var child = foreground('cat', [__filename])

// At this point, it's best to just do nothing else.
// return or whatever.
// If the child gets a signal, or just exits, then this
// parent process will exit in the same way.
```

A callback can optionally be provided, if you want to perform an action
before your foreground-child exits:

```js
var child = foreground('cat', [__filename], function (done) {
  // perform an action.
  return done()
})
```

The callback can return a Promise instead of calling `done`:

```js
var child = foreground('cat', [__filename], async function () {
  // perform an action.
})
```

The callback must not throw or reject.

## Caveats

The "normal" standard IO file descriptors (0, 1, and 2 for stdin,
stdout, and stderr respectively) are shared with the child process.
Additionally, if there is an IPC channel set up in the parent, then
messages are proxied to the child on file descriptor 3.

However, in Node, it's possible to also map arbitrary file descriptors
into a child process.  In these cases, foreground-child will not map
the file descriptors into the child.  If file descriptors 0, 1, or 2
are used for the IPC channel, then strange behavior may happen (like
printing IPC messages to stderr, for example).

Note that a SIGKILL will always kill the parent process, _and never
the child process_, because SIGKILL cannot be caught or proxied.  The
only way to do this would be if Node provided a way to truly exec a
process as the new foreground program in the same process space,
without forking a separate child process.
