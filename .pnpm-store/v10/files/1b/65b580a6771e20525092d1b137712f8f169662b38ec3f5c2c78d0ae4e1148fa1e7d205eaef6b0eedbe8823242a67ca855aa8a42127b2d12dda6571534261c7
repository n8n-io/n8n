# `@actions/io`

> Core functions for cli filesystem scenarios

## Usage

#### mkdir -p

Recursively make a directory. Follows rules specified in [man mkdir](https://linux.die.net/man/1/mkdir) with the `-p` option specified:

```js
const io = require('@actions/io');

await io.mkdirP('path/to/make');
```

#### cp/mv

Copy or move files or folders. Follows rules specified in [man cp](https://linux.die.net/man/1/cp) and [man mv](https://linux.die.net/man/1/mv):

```js
const io = require('@actions/io');

// Recursive must be true for directories
const options = { recursive: true, force: false }

await io.cp('path/to/directory', 'path/to/dest', options);
await io.mv('path/to/file', 'path/to/dest');
```

#### rm -rf

Remove a file or folder recursively. Follows rules specified in [man rm](https://linux.die.net/man/1/rm) with the `-r` and `-f` rules specified.

```js
const io = require('@actions/io');

await io.rmRF('path/to/directory');
await io.rmRF('path/to/file');
```

#### which

Get the path to a tool and resolves via paths. Follows the rules specified in [man which](https://linux.die.net/man/1/which).

```js
const exec = require('@actions/exec');
const io = require('@actions/io');

const pythonPath: string = await io.which('python', true)

await exec.exec(`"${pythonPath}"`, ['main.py']);
```
