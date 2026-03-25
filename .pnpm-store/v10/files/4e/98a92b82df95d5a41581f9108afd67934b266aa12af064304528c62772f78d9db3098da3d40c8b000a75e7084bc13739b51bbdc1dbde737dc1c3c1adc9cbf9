EZ Spawn
=======================

#### Simple, consistent process spawning

[![Cross-Platform Compatibility](https://jstools.dev/img/badges/os-badges.svg)](https://github.com/JS-DevTools/ez-spawn/actions)
[![Build Status](https://github.com/JS-DevTools/ez-spawn/workflows/CI-CD/badge.svg)](https://github.com/JS-DevTools/ez-spawn/actions)

[![Coverage Status](https://coveralls.io/repos/github/JS-DevTools/ez-spawn/badge.svg?branch=master)](https://coveralls.io/github/JS-DevTools/ez-spawn?branch=master)
[![Dependencies](https://david-dm.org/JS-DevTools/ez-spawn.svg)](https://david-dm.org/JS-DevTools/ez-spawn)

[![npm](https://img.shields.io/npm/v/@jsdevtools/ez-spawn.svg)](https://www.npmjs.com/package/@jsdevtools/ez-spawn)
[![License](https://img.shields.io/npm/l/@jsdevtools/ez-spawn.svg)](LICENSE)
[![Buy us a tree](https://img.shields.io/badge/Treeware-%F0%9F%8C%B3-lightgreen)](https://plant.treeware.earth/JS-DevTools/ez-spawn)



Features
--------------------------
- **Flexible input parameters**<br>
  Pass the program and arguments as a single string, an array of strings, or as separate parameters.

- **Pick your async syntax**<br>
  Supports Promises, `async`/`await`, or callbacks.

- **Simple, consistent error handling**<br>
  Non-zero exit codes are treated just like any other error. See [Error Handling](#error-handling) for more details.

- **String output by default**<br>
  stdout and stderr output is automatically decoded as UTF-8 text by default.  You can set the [`encoding` option](#options-object) for a different encoding, or even raw binary buffers.

- **Windows Support**<br>
  Excellent Windows support, thanks to [cross-spawn](https://github.com/moxystudio/node-cross-spawn).



Related Projects
--------------------------
- [chai-exec](https://github.com/JS-DevTools/chai-exec) - Chai assertion plugin for testing CLIs



Examples
--------------------------

```javascript
const ezSpawn = require('@jsdevtools/ez-spawn');

// These are all identical
ezSpawn.sync(`git commit -am "Fixed a bug"`);           // Pass program and args as a string
ezSpawn.sync("git", "commit", "-am", "Fixed a bug");    // Pass program and args as separate params
ezSpawn.sync(["git", "commit", "-am", "Fixed a bug"]);  // Pass program and args as an array
ezSpawn.sync("git", ["commit", "-am", "Fixed a bug"]);  // Pass program as a string and args as an array

// Make a synchronous call
let process = ezSpawn.sync(`git commit -am "Fixed a bug"`);
console.log(process.stdout);

//Make an asynchronous call, using async/await syntax
let process = await ezSpawn.async(`git commit -am "Fixed a bug"`);
console.log(process.stdout);

//Make an asynchronous call, using callback syntax
ezSpawn.async(`git commit -am "Fixed a bug"`, (err, process) => {
  console.log(process.stdout);
});

//Make an asynchronous call, using Promise syntax
ezSpawn.async(`git commit -am "Fixed a bug"`)
  .then((process) => {
    console.log(process.stdout);
  });
```



Installation
--------------------------
Install using [npm](https://docs.npmjs.com/about-npm/):

```bash
npm install @jsdevtools/ez-spawn
```

Then require it in your code:

```javascript
// Require the whole package
const ezSpawn = require("@jsdevtools/ez-spawn");

// Or require "sync" or "async" directly
const ezSpawnSync = require("@jsdevtools/ez-spawn").sync;
const ezSpawnAsync = require("@jsdevtools/ez-spawn").async;
```



API
--------------------------
### `ezSpawn.sync(command, [...arguments], [options])`
Synchronously spawns a process.  This function returns when the proecess exits.

- The `command` and `arguments` parameters can be passed as a single space-separated string, or as an array of strings, or as separate parameters.

- The [`options` object](#options-object) is optional.

- Returns a [`Process` object](#process-object)


### `ezSpawn.async(command, [...arguments], [options], [callback])`
Asynchronously spawns a process.  The Promise resolves (or the callback is called) when the process exits.

- The `command` and `arguments` parameters can be passed as a single space-separated string, or as an array of strings, or as separate parameters.

- The [`options` object](#options-object) is optional.

- If a `callback` is provided, then it will be called when the process exits.  The first is either an `Error` or `null`.  The second parameter is a [`Process` object](#process-object).

- If **no** `callback` is provided, then a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) is returned.  It will resolve with a [`Process` object](#process-object) when the process exits.


### `Options` object
`ezSpawn.async()` and `ezSpawn.sync()` both accept an optional `options` object that closely mirrors the `options` parameter of Node's [`spawn`](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options), [`exec`](https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback), [`spawnSync`](https://nodejs.org/api/child_process.html#child_process_child_process_spawnsync_command_args_options), and [`execSync`](https://nodejs.org/api/child_process.html#child_process_child_process_execsync_command_options) functions.

- `cwd` (string)<br>
  The current working directory of the child process.

- `env` (Object)<br>
  Environment variable key-value pairs.

- `argv0` (string)<br>
  Explicitly set the value of `argv[0]` sent to the child process. This will be set to `command` if not specified.

- `stdio` (Array or string)<br>
  The child process's stdio configuration (see [options.stdio](https://nodejs.org/api/child_process.html#child_process_options_stdio)).

- `input` (string, Buffer, TypedArray, or DataView)<br>
  The value which will be passed as stdin to the spawned process. Supplying this value will override `stdio[0]`.

- `uid` (number)<br>
  Sets the user identity of the process.

- `gid` (number)<br>
  Sets the group identity of the process.

- `timeout` (number)<br>
  The maximum amount of time (in milliseconds) the process is allowed to run.

- `killSignal` (string or integer)<br>
  The signal value to be used when the spawned process will be killed. Defaults to `"SIGTERM"`.

- `maxBuffer` (number)<br>
  The largest amount of data in bytes allowed on stdout or stderr. If exceeded, the child process is terminated.

- `encoding` (string)<br>
  The encoding used for all stdio inputs and outputs. Defaults to `"utf8"`. Set to `"buffer"` for raw binary output.

- `shell` (boolean or string)<br>
  If `true`, then `command` will be run inside of a shell. Uses "/bin/sh" on UNIX, and `process.env.ComSpec` on Windows. A different shell can be specified as a string.

- `windowsVerbatimArguments` (boolean)<br>
  No quoting or escaping of arguments is done on Windows. Ignored on Unix. This is set to true automatically when `shell` is `"CMD"`.

- `windowsHide` (boolean)<br>
  Hide the subprocess console window that would normally be created on Windows systems.


### `Process` object
`ezSpawn.async()` and `ezSpawn.sync()` both return a `Process` object that closely mirrors the object returned by Node's [`spawnSync`](https://nodejs.org/api/child_process.html#child_process_child_process_spawnsync_command_args_options) function.

- `command` (string)<br>
  The command that was used to spawn the process.

- `args` (array of strings)<br>
  The command-line arguments that were passed to the process.

- `pid` (number)<br>
  The numeric process ID assigned by the operating system.

- `stdout` (string or Buffer)<br>
  The process's standard output. This is the same value as `output[1]`.

- `stderr` (string or Buffer)<br>
  The process's error output. This is the same value as `output[2]`.

- `output` (array of strings or Buffers)<br>
  The process's stdio [stdin, stdout, stderr].

- `status` (number)<br>
  The process's status code (a.k.a. "exit code").

- `signal` (string or null)<br>
  The signal used to kill the process, if the process was killed by a signal.

- `toString()`<br>
  Returns the `command` and `args` as a single string.  Useful for console logging.



Error Handling
--------------------------
All sorts of errors can occur when spawning processes.  Node's built-in [`spawn`](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options) and [`spawnSync`](https://nodejs.org/api/child_process.html#child_process_child_process_spawnsync_command_args_options) functions handle different types of errors in different ways.  Sometimes they throw the error, somtimes they emit an ["error" event](https://nodejs.org/docs/latest/api/child_process.html#child_process_event_error), and sometimes they return an object with an `error` property.  They also don't treat non-zero exit codes as errors.  So it's up to you to handle all these different types of errors, and check the exit code too.

EZ Spawn simplifies things by treating all errors the same.  If any error occurs, or if the process exits with a non-zero exit code, then an error is thrown.  The error will have all the same properties as the [`Process` object](#process-object), such as `status`, `stderr`, `signal`, etc.

```javascript
try {
  let process = ezSpawn.sync(`git commit -am "Fixed a bug"`, { throwOnError: true });
  console.log("Everything worked great!", process.stdout);
}
catch (error) {
  console.error("Something went wrong!", error.status, error.stderr);
}
```



Contributing
--------------------------
Contributions, enhancements, and bug-fixes are welcome! [Open an issue](https://github.com/JS-DevTools/ez-spawn/issues) on GitHub and [submit a pull request](https://github.com/JS-DevTools/ez-spawn/pulls).

#### Building/Testing
To build/test the project locally on your computer:

1. __Clone this repo__<br>
`git clone hhttps://github.com/JS-DevTools/ez-spawn.git`

2. __Install dependencies__<br>
`npm install`

3. __Run the tests__<br>
`npm test`



License
--------------------------
EZ Spawn is 100% free and open-source, under the [MIT license](LICENSE). Use it however you want.

This package is [Treeware](http://treeware.earth). If you use it in production, then we ask that you [**buy the world a tree**](https://plant.treeware.earth/JS-DevTools/ez-spawn) to thank us for our work. By contributing to the Treeware forest you’ll be creating employment for local families and restoring wildlife habitats.



Big Thanks To
--------------------------
Thanks to these awesome companies for their support of Open Source developers ❤

[![Travis CI](https://jstools.dev/img/badges/travis-ci.svg)](https://travis-ci.com)
[![SauceLabs](https://jstools.dev/img/badges/sauce-labs.svg)](https://saucelabs.com)
[![Coveralls](https://jstools.dev/img/badges/coveralls.svg)](https://coveralls.io)
