# node-cleanup

installs custom cleanup handlers that run on exiting node

## Installation

```
npm install node-cleanup --save
```

## Overview

`nodeCleanup()` installs functions that perform cleanup activities just before the node process exits. Let's call these functions "cleanup handlers." The cleanup handlers run under the following conditions:

- When the process exits normally (exit code 0).
- When the process exits due to an error, such as an uncaught exception (exit code 1).
- When the process receives one of the following POSIX signals: SIGINT (e.g. *Ctrl-C*), SIGHUP, SIGQUIT, or SIGTERM.

This solution has the following features:

- Allows cleanup handlers to behave as a function of exit code and signal.
- Allows multiple independent subsystems to install cleanup handlers.
- Allows for asynchronous cleanup on receiving a signal by postponing process termination.
- Allows for deferring to child processes the decision about whether a signal terminates the present process. For example, Emacs intercepts *Ctrl-C*, which should prevent its parent process from terminating.
- Allows for writing custom messages to `stderr` on SIGINT (e.g. *Ctrl-C*) and uncaught exceptions, regardless of the number of cleanup handlers installed.
- Allows for uninstalling all cleanup handlers, such as to change termination behavior after having intercepted and cleaned up for a signal.

The module also has an extensive test suite to help ensure reliability.

## Usage

Here is the typical way to use `nodeCleanup()`:

```js
var nodeCleanup = require('node-cleanup');

nodeCleanup(function (exitCode, signal) {
    // release resources here before node exits
});
```

If you only want to install your own messages for *Ctrl-C* and uncaught exception (either or both), you can do this:

```js
nodeCleanup({
    ctrl_C: "{^C}",
    uncaughtException: "Uh oh. Look what happened:"
});
```

To get the default `stderr` messages, without installing a cleanup handler:

```js
nodeCleanup();
```

You may also combine these to install a cleanup handler and `stderr` messages:

```js
nodeCleanup(function (exitCode, signal) {
    // release resources here before node exits
}, {
    ctrl_C: "{^C}",
    uncaughtException: "Uh oh. Look what happened:"
});
```

You may perform asynchronous cleanup upon receiving a signal, as follows:

```js
nodeCleanup(function (exitCode, signal) {
    if (signal) {
        unsavedData.save(function done() {
            // calling process.exit() won't inform parent process of signal
            process.kill(process.pid, signal);
        });
        nodeCleanup.uninstall(); // don't call cleanup handler again
        return false;
    }
});
```

When you hit *Ctrl-C*, you send a SIGINT signal to each process in the current process group. A process group is set of processes that are all supposed to end together as a group instead of persisting independently. However, some programs, such as Emacs, intercept and repurpose SIGINT so that it does not end the process. In such cases, SIGINT should not end any processes of the group. Here is how you can delegate the decision to terminate to a child process:

```js
var nodeCleanup = require('node-cleanup');
var fork = require('child_process').fork;

var child = fork('path-to-child-script.js');
child.on('exit', function (exitCode, signal) {
    child = null; // enable the cleanup handler
    if (signal === 'SIGINT')
        process.kill(process.pid, 'SIGINT');
});

nodeCleanup(function (exitCode, signal) {
    if (child !== null && signal === 'SIGINT')
        return false; // don't exit yet
    // release resources here before node exits
});
```

## Reference

### `nodeCleanup()`

`nodeCleanup()` has the following available ([FlowType](https://flowtype.org/docs/getting-started.html#_)) signatures:

```
function nodeCleanup(cleanupHandler: Function): void
function nodeCleanup(cleanupHandler: Function, stderrMessages: object): void
function nodeCleanup(stderrMessages: object): void
function nodeCleanup(): void
```

The 1st form installs a cleanup handler. The 2nd form also assigns messages to write to `stderr` on SIGINT or an uncaught exception. The 3rd and 4th forms only assign messages to write to `stderr`, without installing a cleanup handler. The 4th form assigns default `stderr` messages.

`cleanupHandler` is a cleanup handler callback and is described in its own section below. When no cleanup handlers are installed, termination events all result in the process terminating, including signal events.

`stderrMessages` is an object mapping any of the keys `ctrl_C` and `uncaughtException` to message strings that output to `stderr`. Set a message to the empty string `''` inhibit a previously-assigned message.

`nodeCleanup()` may be called multiple times to install multiple cleanup handlers or override previous messages. Each handler gets called on each signal or termination condition. The most recently assigned messages apply.

### `nodeCleanup.uninstall()`

`nodeCleanup.uninstall()` uninstalls all installed cleanup handlers and voids the `stderr` message assignments. It may be called multiple times without harm.

This function is primarily useful when a signal occurs and the cleanup handler performs cleanup but disables immediate process termination. In this case, when it is finally time to terminate the process, the cleanup handlers shouldn't run again, so the process uninstalls the handlers before terminating itself.

### Cleanup Handlers

Each cleanup handler has the following ([FlowType](https://flowtype.org/docs/getting-started.html#_)) signature:

```
function cleanupHandler(exitCode: number|null, signal: string|null): boolean?
```

If the process is terminating for a reason other than a POSIX signal, `exitCode` is the exit code, and `signal` is null. Otherwise, if the process received a signal, `signal` is the signal's string name, and `exitCode` is null. These are the arguments passed to a [child process `exit` event](https://nodejs.org/api/child_process.html#child_process_event_exit) handler, mirrored here in `node-cleanup` for consistency.

Node.js defines [these standard exit codes](https://nodejs.org/api/process.html#process_exit_codes), but it does not appear to use code values >128 for signals. According to the node.js docs, [these are the possible signals](http://man7.org/linux/man-pages/man7/signal.7.html), but the cleanup handlers only run on SIGINT (e.g. *Ctrl-C*), SIGHUP, SIGQUIT, or SIGTERM. (It is not possible to intercept SIGKILL.)

The return value of a cleanup handler is only significant for signals. If any cleanup handler returns a boolean `false`, the process does not exit. If they all return `true` (or for backwards compatibility, no return value), the process exits, reporting the signal to the parent process as the reason for the exit. The process always exits after calling the cleanup handlers for non-signals.

When a cleanup handler returns `false` to prevent the process from exiting, the cleanup handler normally takes steps to ensure proper termination later. For example, the process may wait for asynchronous cleanup to complete, or it may wait for a child process to signal termination. Normally in these cases the process would use `nodeCleanup.uninstall()` to uninstall the cleanup handlers prior to the second termination to prevent them from running again.

A cleanup handler should never call `process.exit()`. If a handler prevents a signal from terminating the process but later wishes to terminate the process for reason of this signal, the process should call `process.kill(process.pid, signal)`. In particular, the process should **not** call `process.exit(128 + signalNumber)`, because while this does communicate the exit code to the parent process, it does not communicate the exit signal by the means that the [node.js `child_process` expects](https://nodejs.org/api/child_process.html#child_process_event_exit).

## Testing

This module includes an extensive test suite. You can run it from the module directory with either the [`tap`](http://www.node-tap.org/basics/) or [`subtap`](https://github.com/jtlapp/subtap) test runner, as follows:

```
npm install -g tap
npm install
tap tests/*.js
```

or

```
npm install -g subtap
npm install
subtap
```

(As of this writing, the test suite has only been run on a Mac. Behavior may vary from OS to OS, so I'm looking for feedback from other operating systems.)

## Incompatibilities with v1.0.x

`node-cleanup` v2+ is not fully compatible with v1.x. You may need to change your usage to upgrade. These are the potential incompatibilities:

- The cleanup handlers now also run on SIGHUP, SIGQUIT, and SIGTERM, which were not getting cleanup processing before.
- `stderr` messages are handled quite differently. Previously, there were defaults that you had to override, and only your first message assignments applied. Now, the defaults **only** install with the parameterless call `nodeCleanup()`. Otherwise there are no messages unless you provide them. Moreover, the most recent message assignments are the ones that get used.

## Acknowledgements

This module began by borrowing and modifying code from CanyonCasa's [answer to a stackoverflow question](http://stackoverflow.com/a/21947851/650894). I had found the code necessary for all my node projects. @Banjocat piped in with a [comment](http://stackoverflow.com/questions/14031763/doing-a-cleanup-action-just-before-node-js-exits/21947851#comment68567869_21947851) about how the solution didn't properly handle SIGINT. (See [this detailed explanation](https://www.cons.org/cracauer/sigint.html) of the SIGINT problem). I have completely rewritten the module to properly deal with SIGINT and other signals (I hope!). The rewrite also provides some additional flexibility that @zixia and I found ourselves needing for our respective projects.

## License

*This license applies to v2 and later. v1 derived from [this stackoverflow answer](http://stackoverflow.com/a/21947851/650894).*

MIT License

Copyright (c) 2016 Joseph T. Lapp

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
