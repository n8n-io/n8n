# detective-typescript

[![CI](https://img.shields.io/github/actions/workflow/status/dependents/detective-typescript/ci.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/detective-typescript/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/detective-typescript?logo=npm&logoColor=fff)](https://www.npmjs.com/package/detective-typescript)
[![npm downloads](https://img.shields.io/npm/dm/detective-typescript)](https://www.npmjs.com/package/detective-typescript)

> Get the dependencies of TypeScript module

```sh
npm install detective-typescript typescript
```

## Usage

```js
const fs = require('fs');
const detective = require('detective-typescript');

const mySourceCode = fs.readFileSync('myfile.ts', 'utf8');

// Pass in a file's content or an AST
const dependencies = detective(mySourceCode);
```

## Options

- `skipTypeImports` (default: `false`) Skips imports that only imports types
- `mixedImports`: (default: `false`) Include CJS imports in dependency list
- `skipAsyncImports`: (default: `false`) Whether or not to omit async imports (import('foo'))
- `jsx`: (default: `false`) Enable parsing of JSX
- `onFile`: A callback that will be called before the file is processed. Intended for use with [`dependency-tree`](https://github.com/dependents/node-dependency-tree). Passed an object argument with properties `options` (echoing any options passed in, e.g., by [`precinct`](https://github.com/dependents/node-precinct)), `src` (source code for file as string), `ast` (parsed AST object for the file source), and `walker` (a `Walker` instance from [`node-source-walk`](https://github.com/dependents/node-source-walk) configured for TypeScript to which you can pass the `ast` or `src`).
- `onAfterFile`: Similar to `onFile`, but the callback is also passed an object property `dependencies`, a string array with the extracted dependencies.

## License

MIT
