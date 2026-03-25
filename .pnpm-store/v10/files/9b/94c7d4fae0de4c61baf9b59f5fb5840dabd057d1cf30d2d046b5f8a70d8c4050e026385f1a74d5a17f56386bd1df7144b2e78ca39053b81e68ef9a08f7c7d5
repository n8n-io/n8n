# pug-strip-comments

Strips comments from Pug token stream

[![Build Status](https://img.shields.io/travis/pugjs/pug-strip-comments/master.svg)](https://travis-ci.org/pugjs/pug-strip-comments)
[![Dependencies Status](https://david-dm.org/pugjs/pug/status.svg?path=packages/pug-strip-comments)](https://david-dm.org/pugjs/pug?path=packages/pug-strip-comments)
[![DevDependencies Status](https://david-dm.org/pugjs/pug/dev-status.svg?path=packages/pug-strip-comments)](https://david-dm.org/pugjs/pug?path=packages/pug-strip-comments&type=dev)
[![NPM version](https://img.shields.io/npm/v/pug-strip-comments.svg)](https://www.npmjs.org/package/pug-strip-comments)

## Installation

    npm install pug-strip-comments

## Usage

```js
var lex = require('pug-lexer');
var stripComments = require('pug-strip-comments');

var tokens = lex('//- unbuffered\n// buffered');
// [ { type: 'comment', line: 1, val: ' unbuffered', buffer: false },
//   { type: 'newline', line: 2 },
//   { type: 'comment', line: 2, val: ' buffered', buffer: true },
//   { type: 'eos', line: 2 } ]

// Only strip unbuffered comments (default)
stripComments(tokens, { filename: 'pug' });
// [ { type: 'newline', line: 2 },
//   { type: 'comment', line: 2, val: ' buffered', buffer: true },
//   { type: 'eos', line: 2 } ]

// Only strip buffered comments (when you want to play a joke on your coworkers)
stripComments(tokens, { filename: 'pug', stripUnbuffered: false, stripBuffered: true });
// [ { type: 'comment', line: 1, val: ' unbuffered', buffer: false },
//   { type: 'newline', line: 2 },
//   { type: 'eos', line: 2 } ]

// Strip both (if you want Pug VERY clean)
stripComments(tokens, { filename: 'pug', stripBuffered: true });
// [ { type: 'newline', line: 2 },
//   { type: 'eos', line: 2 } ]
```

## License

MIT
