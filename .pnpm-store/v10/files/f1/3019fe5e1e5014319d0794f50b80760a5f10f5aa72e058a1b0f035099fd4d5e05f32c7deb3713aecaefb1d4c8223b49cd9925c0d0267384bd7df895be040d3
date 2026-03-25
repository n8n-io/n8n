# detective-cjs

[![CI](https://img.shields.io/github/actions/workflow/status/dependents/node-detective-cjs/ci.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/node-detective-cjs/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/detective-cjs?logo=npm&logoColor=fff)](https://www.npmjs.com/package/detective-cjs)
[![npm downloads](https://img.shields.io/npm/dm/detective-cjs)](https://www.npmjs.com/package/detective-cjs)

> Get the dependencies of a CommonJS module by traversing its AST

```sh
npm install detective-cjs
```

But dude, substack already built this: node-detective. Yes, but I needed the capability to reuse an AST
and this was unlikely to be merged timely. I can also support jsx and other syntactic constructs faster.

## Usage

```js
const fs = require('fs');
const detective = require('detective-cjs');

const mySourceCode = fs.readFileSync('myfile.js', 'utf8');

// Pass in a file's content or an AST
const dependencies = detective(mySourceCode);
```

* Supports JSX, ES7, and any other features that [node-source-walk](https://github.com/dependents/node-source-walk) supports.

## License

[MIT](LICENSE)
