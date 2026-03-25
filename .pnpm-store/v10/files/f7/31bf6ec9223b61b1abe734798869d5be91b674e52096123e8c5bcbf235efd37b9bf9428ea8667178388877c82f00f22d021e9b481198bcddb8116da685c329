# pug-lexer

The pug lexer.  This module is responsible for taking a string and converting it into an array of tokens.

[![Build Status](https://img.shields.io/travis/pugjs/pug-lexer/master.svg)](https://travis-ci.org/pugjs/pug-lexer)
[![Dependencies Status](https://david-dm.org/pugjs/pug/status.svg?path=packages/pug-lexer)](https://david-dm.org/pugjs/pug?path=packages/pug-lexer)
[![DevDependencies Status](https://david-dm.org/pugjs/pug/dev-status.svg?path=packages/pug-lexer)](https://david-dm.org/pugjs/pug?path=packages/pug-lexer&type=dev)
[![NPM version](https://img.shields.io/npm/v/pug-lexer.svg)](https://www.npmjs.org/package/pug-lexer)
[![Coverage Status](https://img.shields.io/codecov/c/github/pugjs/pug-lexer.svg)](https://codecov.io/gh/pugjs/pug-lexer)

## Installation

    npm install pug-lexer

## Usage

```js
var lex = require('pug-lexer');
```

### `lex(str, options)`

Convert Pug string to an array of tokens.

`options` can contain the following properties:

- `filename` (string): The name of the Pug file; it is used in error handling if provided.
- `plugins` (array): An array of plugins, in the order they should be applied.

```js
console.log(JSON.stringify(lex('div(data-foo="bar")', {filename: 'my-file.pug'}), null, '  '))
```

```json
[
  {
    "type": "tag",
    "line": 1,
    "val": "div",
    "selfClosing": false
  },
  {
    "type": "attrs",
    "line": 1,
    "attrs": [
      {
        "name": "data-foo",
        "val": "\"bar\"",
        "escaped": true
      }
    ]
  },
  {
    "type": "eos",
    "line": 1
  }
]
```

### `new lex.Lexer(str, options)`

Constructor for a Lexer class. This is not meant to be used directly unless you know what you are doing.

`options` may contain the following properties:

- `filename` (string): The name of the Pug file; it is used in error handling if provided.
- `interpolated` (boolean): if the Lexer is created as a child lexer for inline tag interpolation (e.g. `#[p Hello]`). Defaults to `false`.
- `startingLine` (integer): the real line number of the first line in the input. It is also used for inline tag interpolation. Defaults to `1`.
- `plugins` (array): An array of plugins, in the order they should be applied.

## License

  MIT
