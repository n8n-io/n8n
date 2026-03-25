[![Build Status](https://travis-ci.com/gilamran/tsc-watch.svg?branch=master)](https://travis-ci.com/gilamran/tsc-watch)

# The nodemon for TypeScript

`tsc-watch` starts the installed TypeScript compiler (`tsc`) with `--watch` parameter, with the ability to react to compilation status.
`tsc-watch` was created to allow an easy dev process with TypeScript. Commonly used to restart a node server, similar to nodemon but for TypeScript.

**Anything that you can do with `tsc` you can do with `tsc-watch`, the only difference is that `tsc-watch` can react to compilation status.**

| Argument                          | Description                                                                                                                                         |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--onSuccess COMMAND`             | Executes `COMMAND` on **every successful** compilation.                                                                                             |
| `--onFirstSuccess COMMAND`        | Executes `COMMAND` on the **first successful** compilation.                                                                                         |
| `--onEmit COMMAND`                | Executes debounced `COMMAND` on **every emitted file**, ignoring unchanged files and disregards compilation success or failure.                     |
| `--onEmitDebounceMs DELAY`        | Delay by which to debounce `--onEmit` (default: 300).                                                                                               |
| `--onFailure COMMAND`             | Executes `COMMAND` on **every failed** compilation.                                                                                                 |
| `--onCompilationStarted COMMAND`  | Executes `COMMAND` on **every compilation start** event (initial and incremental).                                                                  |
| `--onCompilationComplete COMMAND` | Executes `COMMAND` on **every successful or failed** compilation.                                                                                   |
| `--maxNodeMem`                    | Calls `node` with a specific memory limit `max_old_space_size`, to use if your project needs more memory.                                           |
| `--noColors`                      | By default tsc-watch adds colors the output with green<br>on success, and in red on failure. <br>Add this argument to prevent that.                 |
| `--noClear`                       | In watch mode the `tsc` compiler clears the screen before reporting<br>Add this argument to prevent that.                                           |
| `--signalEmittedFiles`            | Will run `tsc` compiler with `--listEmittedFiles`, but hiding TSFILE lines. Use it to enable `file_emitted` event, while keeping tsc stdout silent. |
| `--silent`                        | Do not print any messages on stdout.                                                                                                                |
| `--compiler PATH`                 | The `PATH` will be used instead of typescript compiler.<br>Default is `typescript/bin/tsc`                                                          |

Notes:

- That all the above `COMMAND`s will be killed on process exit. (Using `SIGTERM`)

- A `COMMAND` is a single command and not multi command like `script1.sh && script2.sh`

- Any child process (`COMMAND`) will be terminated before creating a new one.

## Install

```sh
npm install tsc-watch --save-dev
```

```sh
## for command-line usage
npm install -g typescript tsc-watch
```

## Usage

### From Command-Line

```sh
## Watching a project (with tsconfig.json)
tsc-watch --onSuccess "node ./dist/server.js"

## Beep on failure
tsc-watch --onFailure "echo Beep! Compilation Failed"

## Watching a single file
tsc-watch server.ts --outDir ./dist --onSuccess "node ./dist/server.js"

## Custom compiler
tsc-watch --onSuccess "node ./dist/server.js" --compiler my-typescript/bin/tsc
```

### From npm script

```
"dev-server": "tsc-watch --noClear -p ./src/tsconfig.json --onSuccess \"node ./dist/server.js\"",
```

### From javascript

You can see a detailed example [here](https://github.com/gilamran/tsc-watch/blob/master/tsc-watch-client-example.js)

The client is implemented as an instance of `Node.JS`'s `EventEmitter`, with the following events:

- `started` - Emitted upon the compilation start (initial or incremental).
- `first_success` - Emitted upon first successful compilation.
- `subsequent_success` - Emitted upon every subsequent successful compilation.
- `compile_errors` - Emitted upon every failing compilation.
- `file_emitted` - Emitted upon every file transpiled if `--listEmittedFiles` is used.

Once subscribed to the relevant events, start the client by running `watch.start()`

To kill the client, run `watch.kill()`

Example usage:

```javascript
// Using CommonJS:
const { TscWatchClient } = require('tsc-watch/client');
// Using ES6 import:
import { TscWatchClient } from 'tsc-watch/client';

const watch = new TscWatchClient();

watch.on('started', () => {
  console.log('Compilation started');
});

watch.on('first_success', () => {
  console.log('First success!');
});

watch.on('success', () => {
  // Your code goes here...
});

watch.on('compile_errors', () => {
  // Your code goes here...
});

watch.start('--project', '.');

try {
  // do something...
} catch (e) {
  watch.kill(); // Fatal error, kill the compiler instance.
}
```

Notes:

- The (`onSuccess`) `COMMAND` will not run if the compilation failed.
- The (`onEmit`) `COMMAND` will not run if the compilation succeeded with no changed files, unless it is the first success.
- The (`onEmit`) `COMMAND` will run even if the compilation failed, but emitted changed files.
- The (`onEmit`) `COMMAND` will not run 100 times for 100 files, due to `--onEmitDebounce`
- The (`onEmit`) `COMMAND` is not cancelling the `onSuccess`/`onFirstSuccess`/`onFailure`/`onCompilationComplete`/`onCompilationStarted` commands and vice versa.
- `tsc-watch` is using the currently installed TypeScript compiler.
- `tsc-watch` is not changing the compiler, just adds the new arguments, compilation is the same, and all other arguments are the same.
