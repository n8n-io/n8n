# spawn-wrap

Wrap all spawned Node.js child processes by adding environs and
arguments ahead of the main JavaScript file argument.

Any child processes launched by that child process will also be
wrapped in a similar fashion.

This is a bit of a brutal hack, designed primarily to support code
coverage reporting in cases where tests or the system under test are
loaded via child processes rather than via `require()`.

It can also be handy if you want to run your own mock executable
instead of some other thing when child procs call into it.

[![Build Status](https://travis-ci.org/istanbuljs/spawn-wrap.svg)](https://travis-ci.org/istanbuljs/spawn-wrap)

## USAGE

```javascript
var wrap = require('spawn-wrap')

// wrap(wrapperArgs, environs)
var unwrap = wrap(['/path/to/my/main.js', 'foo=bar'], { FOO: 1 })

// later to undo the wrapping, you can call the returned function
unwrap()
```

In this example, the `/path/to/my/main.js` file will be used as the
"main" module, whenever any Node or io.js child process is started,
whether via a call to `spawn` or `exec`, whether node is invoked
directly as the command or as the result of a shebang `#!` lookup.

In `/path/to/my/main.js`, you can do whatever instrumentation or
environment manipulation you like.  When you're done, and ready to run
the "real" main.js file (ie, the one that was spawned in the first
place), you can do this:

```javascript
// /path/to/my/main.js
// process.argv[1] === 'foo=bar'
// and process.env.FOO === '1'

// my wrapping manipulations
setupInstrumentationOrCoverageOrWhatever()
process.on('exit', function (code) {
  storeCoverageInfoSynchronously()
})

// now run the instrumented and covered or whatever codes
require('spawn-wrap').runMain()
```

## ENVIRONMENT VARIABLES

Spawn-wrap responds to two environment variables, both of which are
preserved through child processes.

`SPAWN_WRAP_DEBUG=1` in the environment will make this module dump a
lot of information to stderr.

`SPAWN_WRAP_SHIM_ROOT` can be set to a path on the filesystem where
the shim files are written in a `.node-spawn-wrap-<id>` folder.  By
default this is done in `$HOME`, but in some environments you may wish
to point it at some other root.  (For example, if `$HOME` is mounted
as read-only in a virtual machine or container.)

## CONTRACTS and CAVEATS

The initial wrap call uses synchronous I/O.  Probably you should not
be using this script in any production environments anyway.

Also, this will slow down child process execution by a lot, since
we're adding a few layers of indirection.

The contract which this library aims to uphold is:

* Wrapped processes behave identical to their unwrapped counterparts
  for all intents and purposes.  That means that the wrapper script
  propagates all signals and exit codes.
* If you send a signal to the wrapper, the child gets the signal.
* If the child exits with a numeric status code, then the wrapper
  exits with that code.
* If the child dies with a signal, then the wrapper dies with the
  same signal.
* If you execute any Node child process, in any of the various ways
  that such a thing can be done, it will be wrapped.
* Children of wrapped processes are also wrapped.

(Much of this made possible by
[foreground-child](http://npm.im/foreground-child).)

There are a few ways situations in which this contract cannot be
adhered to, despite best efforts:

1. In order to handle cases where `node` is invoked in a shell script,
   the `PATH` environment variable is modified such that the the shim
   will be run before the "real" node.  However, since Windows does
   not allow executing shebang scripts like regular programs, a
   `node.cmd` file is required.
2. Signal propagation through `dash` doesn't always work.  So, if you
   use `child_process.exec()` on systems where `/bin/sh` is actually
   `dash`, then the process may exit with a status code > 128 rather
   than indicating that it received a signal.
3. `cmd.exe` is even stranger with how it propagates and interprets
   unix signals.  If you want your programs to be portable, then
   probably you wanna not rely on signals too much.
4. It *is* possible to escape the wrapping, if you spawn a bash
   script, and that script modifies the `PATH`, and then calls a
   specific `node` binary explicitly.
