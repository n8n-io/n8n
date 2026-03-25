# @dependents/detective-less

[![CI](https://img.shields.io/github/actions/workflow/status/dependents/node-detective-less/ci.yml?branch=main&label=CI&logo=github)](https://github.com/dependents/node-detective-less/actions/workflows/ci.yml?query=branch%3Amain)
[![npm version](https://img.shields.io/npm/v/@dependents/detective-less?logo=npm&logoColor=fff)](https://www.npmjs.com/package/@dependents/detective-less)
[![npm downloads](https://img.shields.io/npm/dm/@dependents/detective-less)](https://www.npmjs.com/package/@dependents/detective-less)

> Find the dependencies of a less file

```sh
npm install @dependents/detective-less
```

**Note:** This is specific to the .less style syntax.

It's the LESS counterpart to [detective](https://github.com/substack/node-detective), [detective-amd](https://github.com/dependents/node-detective-amd), and [detective-es6](https://github.com/dependents/node-detective-es6).

* The AST is generated using the [gonzales-pe](https://github.com/tonyganch/gonzales-pe) parser.

## Usage

```js
const fs = require('fs');
const detective = require('@dependents/detective-less');

const content = fs.readFileSync('styles.less', 'utf8');

// list of imported file names (ex: 'foo.less', 'foo', etc)
const dependencies = detective(content);

// or to also detect any url() references to images, fonts, etc.
const allDependencies = detective(content, { url: true });
```

### Options

* `url` (optional): (`Boolean`) also detect any `url()` references to images, fonts, etc.

## License

[MIT](LICENSE)
