var shellescape = require('../');

var assert = require('assert');

var d = {
  "echo 'hello\\nworld'": ['echo', 'hello\\nworld'],
  "echo 'hello\\tworld'": ['echo', 'hello\\tworld'],
  "echo '\thello\nworld'\\'": ['echo', '\thello\nworld\''],
  "echo 'hello  world'": ['echo', 'hello  world'],
  "echo hello world": ['echo', 'hello', 'world'],
  "echo 'hello\\\\'\\' \\''\\\\'\\''world'": ["echo", "hello\\\\'", "'\\\\'world"],
  "echo hello 'world\\'": ["echo", "hello", "world\\"]
};

Object.keys(d).forEach(function(s) {
  var escaped = shellescape(d[s]);
  assert.strictEqual(escaped, s);
  console.log(s);
});
