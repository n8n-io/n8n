# token-stream

Take an array of token and produce a more useful API to give to a parser.

[![Build Status](https://img.shields.io/travis/pugjs/token-stream/master.svg)](https://travis-ci.org/pugjs/token-stream)
[![Dependency Status](https://img.shields.io/david/pugjs/token-stream.svg)](https://david-dm.org/pugjs/token-stream)
[![NPM version](https://img.shields.io/npm/v/token-stream.svg)](https://www.npmjs.org/package/token-stream)

## Installation

    npm install token-stream

## Usage

```js
var TokenStream = require('token-stream');

var stream = new TokenStream([
  'a',
  'b',
  'c',
  'd'
]);
assert(stream.peek() === 'a');
assert(stream.lookahead(0) == 'a');
assert(stream.lookahead(1) == 'b');

assert(stream.advance() === 'a');
assert(stream.peek() === 'b');
assert(stream.lookahead(0) == 'b');
assert(stream.lookahead(1) == 'c');

stream.defer('z');
assert(stream.peek() === 'z');
assert(stream.lookahead(0) == 'z');
assert(stream.lookahead(1) == 'b');
assert(stream.advance() === 'z');
assert(stream.advance() === 'b');
assert(stream.advance() === 'c');
assert(stream.advance() === 'd');

// an error is thrown if you try and advance beyond the end of the stream
assert.throws(function () {
  stream.advance();
});
```

## API

### stream.peek()

Gets and returns the next item in the stream without advancing the stream's position.

### stream.advance()

Returns the next item in the stream and advances the stream by one item.

### stream.defer(token)

Put a token on the start of the stream (useful if you need to back track after calling advance).

### stream.lookahead(index)

Return the item at `index` position from the start of the stream, but don't advance the stream.  `stream.lookahead(0)` is equivalent to `stream.peek()`.

## License

  MIT
