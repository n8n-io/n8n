# spawn-command [![Build Status](https://secure.travis-ci.org/mmalecki/spawn-command.png)](http://travis-ci.org/mmalecki/spawn-command)
Spawn commands like `child_process.exec` does but return a `ChildProcess`.

## Installation

    npm install spawn-command

## Usage
```js
var spawnCommand = require('spawn-command'),
    child = spawnCommand('echo "Hello spawn" | base64');

child.stdout.on('data', function (data) {
  console.log('data', data);
});

child.on('exit', function (exitCode) {
  console.log('exit', exitCode);
});
```
