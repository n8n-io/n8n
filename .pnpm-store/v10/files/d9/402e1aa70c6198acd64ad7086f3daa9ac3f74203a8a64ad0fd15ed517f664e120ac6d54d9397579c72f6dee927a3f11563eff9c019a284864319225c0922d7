# detective-es6

[![CI](https://img.shields.io/github/actions/workflow/status/dependents/node-detective-es6/ci.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/node-detective-es6/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/detective-es6?logo=npm&logoColor=fff)](https://www.npmjs.com/package/detective-es6)
[![npm downloads](https://img.shields.io/npm/dm/detective-es6)](https://www.npmjs.com/package/detective-es6)

> Get the dependencies of an ES6 module

```sh
npm install detective-es6
```

## Usage

```js
const fs = require('fs');
const detective = require('detective-es6');

const mySourceCode = fs.readFileSync('myfile.js', 'utf8');

// Pass in a file's content or an AST
const dependencies = detective(mySourceCode);
```

* Supports JSX, Flow, and any other features that [node-source-walk](https://github.com/dependents/node-source-walk) supports.

You may also (optionally) configure the detective via a second object argument detective(src, options) that supports the following options:

- `skipTypeImports`: (Boolean) whether or not to omit type imports (`import type {foo} from "mylib";`) in the list of extracted dependencies.
- `skipAsyncImports`: (Boolean) whether or not to omit async imports (`import('foo')`) in the list of extracted dependencies.

## License

[MIT](LICENSE)
