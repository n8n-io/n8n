'use strict';

var assert = require('assert');
var TokenStream = require('../');

assert.throws(function () {
  new TokenStream('foo,bar');
});
var stream = new TokenStream([
  'a',
  'b',
  'c',
  'd'
]);
assert.throws(function () {
  stream.lookahead(9);
});
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
assert.throws(function () {
  stream.peek();
});
assert.throws(function () {
  stream.lookahead(0);
});
assert.throws(function () {
  stream.lookahead(1);
});
assert.throws(function () {
  stream.advance();
});
