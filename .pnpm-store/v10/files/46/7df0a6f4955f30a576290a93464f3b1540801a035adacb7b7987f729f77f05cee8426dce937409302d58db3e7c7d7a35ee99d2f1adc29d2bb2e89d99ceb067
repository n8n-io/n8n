# `@actions/exec`

## Usage

#### Basic

You can use this package to execute tools in a cross platform way:

```js
const exec = require('@actions/exec');

await exec.exec('node index.js');
```

#### Args

You can also pass in arg arrays:

```js
const exec = require('@actions/exec');

await exec.exec('node', ['index.js', 'foo=bar']);
```

#### Output/options

Capture output or specify [other options](https://github.com/actions/toolkit/blob/d9347d4ab99fd507c0b9104b2cf79fb44fcc827d/packages/exec/src/interfaces.ts#L5):

```js
const exec = require('@actions/exec');

let myOutput = '';
let myError = '';

const options = {};
options.listeners = {
  stdout: (data: Buffer) => {
    myOutput += data.toString();
  },
  stderr: (data: Buffer) => {
    myError += data.toString();
  }
};
options.cwd = './lib';

await exec.exec('node', ['index.js', 'foo=bar'], options);
```

#### Exec tools not in the PATH

You can specify the full path for tools not in the PATH:

```js
const exec = require('@actions/exec');

await exec.exec('"/path/to/my-tool"', ['arg1']);
```
