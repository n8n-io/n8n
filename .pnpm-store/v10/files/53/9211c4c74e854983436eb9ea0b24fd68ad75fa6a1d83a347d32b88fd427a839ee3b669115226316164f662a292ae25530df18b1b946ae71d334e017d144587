# pug-parser

The pug parser (takes an array of tokens and converts it to an abstract syntax tree)

[![Build Status](https://img.shields.io/travis/pugjs/pug-parser/master.svg)](https://travis-ci.org/pugjs/pug-parser)
[![Dependencies Status](https://david-dm.org/pugjs/pug/status.svg?path=packages/pug-parser)](https://david-dm.org/pugjs/pug?path=packages/pug-parser)
[![DevDependencies Status](https://david-dm.org/pugjs/pug/dev-status.svg?path=packages/pug-parser)](https://david-dm.org/pugjs/pug?path=packages/pug-parser&type=dev)
[![NPM version](https://img.shields.io/npm/v/pug-parser.svg)](https://www.npmjs.org/package/pug-parser)

## Installation

    npm install pug-parser

## Usage

```js
var parse = require('pug-parser');
```

### `parse(tokens, options)`

Convert Pug tokens to an abstract syntax tree (AST).

`options` can contain the following properties:

- `filename` (string): The name of the Pug file; it is included in the produced AST nodes and error handling, if provided.
- `plugins` (array): An array of plugins, in the order they should be applied.
- `src` (string): The source of the Pug file; it is used in error handling if provided.

```js
var lex = require('pug-lexer');

var filename = 'my-file.pug';
var src = 'div(data-foo="bar")';
var tokens = lex(src, {filename});

var ast = parse(tokens, {filename, src});

console.log(JSON.stringify(ast, null, '  '))
```

```json
{
  "type": "Block",
  "nodes": [
    {
      "type": "Tag",
      "name": "div",
      "selfClosing": false,
      "block": {
        "type": "Block",
        "nodes": [],
        "line": 1,
        "filename": "my-file.pug"
      },
      "attrs": [
        {
          "name": "data-foo",
          "val": "\"bar\"",
          "line": 1,
          "column": 5,
          "filename": "my-file.pug",
          "mustEscape": true
        }
      ],
      "attributeBlocks": [],
      "isInline": false,
      "line": 1,
      "column": 1,
      "filename": "my-file.pug"
    }
  ],
  "line": 0,
  "filename": "my-file.pug"
}
```

### `new parse.Parser(tokens, options)`

Constructor for a Parser class. This is not meant to be used directly unless you know what you are doing.

`options` may contain the following properties:

- `filename` (string): The name of the Pug file; it is included in the produced AST nodes and error handling, if provided.
- `plugins` (array): An array of plugins, in the order they should be applied.
- `src` (string): The source of the Pug file; it is used in error handling if provided.

## License

  MIT
