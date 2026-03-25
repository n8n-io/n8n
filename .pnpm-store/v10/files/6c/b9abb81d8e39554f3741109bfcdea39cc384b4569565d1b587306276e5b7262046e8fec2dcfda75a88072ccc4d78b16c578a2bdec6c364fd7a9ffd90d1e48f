# regjsgen [![Build status][ci-img]][ci] [![Code coverage status][codecov-img]][codecov]

Generate regular expressions from [regjsparser][regjsparser]’s AST.

## Installation

```sh
npm i regjsgen
```

## API

### `regjsgen.generate(ast)`

This function accepts an abstract syntax tree representing a regular expression (see [regjsparser][regjsparser]), and returns the generated regular expression string.

```js
const regjsparser = require('regjsparser');
const regjsgen = require('regjsgen');

// Generate an AST with `regjsparser`.
let ast = regjsparser.parse(regex);

// Modify AST
// …

// Generate `RegExp` string with `regjsgen`.
let regex = regjsgen.generate(ast);
```

## Support

Tested on Node.js 16 and 18.<br>
Compatible with regjsparser v0.10.0’s AST.


[ci]: https://github.com/bnjmnt4n/regjsgen/actions
[ci-img]: https://github.com/bnjmnt4n/regjsgen/workflows/Node.js%20CI/badge.svg
[codecov]: https://codecov.io/gh/bnjmnt4n/regjsgen
[codecov-img]: https://codecov.io/gh/bnjmnt4n/regjsgen/branch/main/graph/badge.svg
[regjsparser]: https://github.com/jviereck/regjsparser
