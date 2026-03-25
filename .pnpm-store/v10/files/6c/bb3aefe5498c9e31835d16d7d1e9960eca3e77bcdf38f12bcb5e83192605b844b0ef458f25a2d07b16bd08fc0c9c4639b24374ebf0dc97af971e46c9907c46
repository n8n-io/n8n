# module-lookup-amd

[![CI](https://img.shields.io/github/actions/workflow/status/dependents/node-module-lookup-amd/ci.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/node-module-lookup-amd/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/module-lookup-amd?logo=npm&logoColor=fff)](https://www.npmjs.com/package/module-lookup-amd)
[![npm downloads](https://img.shields.io/npm/dm/module-lookup-amd)](https://www.npmjs.com/package/module-lookup-amd)

> Resolve AMD dependency paths to an absolute path on the filesystem

This module takes in a partial and *synchronously* gives back its absolute path on the filesystem.

I built this for [Dependents'](https://sublime.wbond.net/packages/Dependents) [jump to dependency](https://github.com/dependents/Dependents#jump-to-a-dependency) feature that lets you click on a module name
and open the relevant file.

```sh
npm install module-lookup-amd
```

## Usage

```js
const lookup = require('module-lookup-amd');

const realPath = lookup({
  partial: 'someModule',
  filename: 'file/containing/partial',
  directory: 'path/to/all/js/files', // optional
  config: 'path/to/my/requirejs/config', // optional
  fileSystem: {} // optional
});
```

* `partial`: the dependency that you want to lookup
* `filename`: the path of the file that contains the dependency (i.e., parent module)
* `directory`: Used to resolve files if you're not using a requirejs config
* `config`: the path to your RequireJS configuration file
  * As an optimization, you can provide a pre-parsed config object (the contents of the RequireJS config in object form)
  as `config`. You are then required to provide a `directory` argument which is assumed to be the location where your config would have been.
* `fileSystem`: An alternative `fs` implementation to use for filesystem interactions. Defaults to Node.js's `fs` implementation if not supplied.

## CLI

Assumes a global `-g` installation

```sh
lookup-amd -c path/to/my/config.js -f path/to/file/containing/dependency -d path/containing/all/files my/dependency/name
```

## License

[MIT](LICENSE)
