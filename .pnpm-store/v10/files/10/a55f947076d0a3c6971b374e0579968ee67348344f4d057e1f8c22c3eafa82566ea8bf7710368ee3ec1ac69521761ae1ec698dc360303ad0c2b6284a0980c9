var shellescape = require('../');

var assert = require('assert');

var args = ['echo', 'hello!', 'how are you doing $USER', '"double"', "'single'"];

var escaped = shellescape(args);
assert.strictEqual(escaped, "echo 'hello!' 'how are you doing $USER' '\"double\"' \\''single'\\'");
console.log(escaped);
