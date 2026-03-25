# pug-error

Standard error objects for pug.  This module is intended for use by the lexer, parser, loader, linker, code-generator and any plugins.

[![Build Status](https://img.shields.io/travis/pugjs/pug-error/master.svg)](https://travis-ci.org/pugjs/pug-error)
[![Dependencies Status](https://david-dm.org/pugjs/pug/status.svg?path=packages/pug-error)](https://david-dm.org/pugjs/pug?path=packages/pug-error)
[![NPM version](https://img.shields.io/npm/v/pug-error.svg)](https://www.npmjs.org/package/pug-error)

## Installation

    npm install pug-error

## Usage

```js
var error = require('pug-error');
```

### `error(code, message, options)`

Create a Pug error object.

`code` is a required unique code for the error type that can be used to pinpoint a certain error.

`message` is a human-readable explanation of the error.

`options` can contain any of the following properties:

- `filename`: the name of the file causing the error
- `line`: the offending line
- `column`: the offending column
- `src`: the Pug source, if available, for pretty-printing the error context

The resulting error object is a simple Error object with additional properties given in the arguments.

**Caveat:** the `message` argument is stored in `err.msg`, not `err.message`, which is occupied with a better-formatted message.

```js
var error = require('pug-error');

var err = error('MY_CODE', 'My message', {line: 3, filename: 'myfile', src: 'foo\nbar\nbaz\nbash\nbing'});
// { code: 'PUG:MY_CODE',
//   msg: 'My message',
//   line: 3,
//   column: undefined,
//   filename: 'myfile',
//   src: 'foo\nbar\nbaz\nbash\nbing',
//   message: 'myfile:3\n    1| foo\n    2| bar\n  > 3| baz\n    4| bash\n    5| bing\n\nMy message' }

throw err;
```

## License

  MIT
