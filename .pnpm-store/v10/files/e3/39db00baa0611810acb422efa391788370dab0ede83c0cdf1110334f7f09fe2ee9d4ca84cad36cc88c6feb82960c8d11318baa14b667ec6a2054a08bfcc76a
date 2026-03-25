
var assert = require('assert')

var q = require('./')

var test = [
  ['foo "bar baz', "'foo \"bar baz'"],
  ["foo 'bar baz", '"foo \'bar baz"'],
  ['foo "bar\'s baz"', '"foo \\\"bar\'s baz\\\""'],
  ['"', "'\"'"],
  ['\\', "'\\\\'"]
]


test.forEach(function (e) {
  console.log(e.join(' - '))
  assert.equal(q.quote(e[0]), e[1])
  assert.equal(q.unquote(e[1]), e[0])
  assert.equal(q.unquote(q.quote(e[1])), e[1])
  assert.equal(q.unquote(q.quote(e[0])), e[0])
  assert.equal(q.unquote(q.unquote(q.quote(q.quote(e[1])))), e[1])
  console.log('UQ',q.unquote(e[1]))
})
