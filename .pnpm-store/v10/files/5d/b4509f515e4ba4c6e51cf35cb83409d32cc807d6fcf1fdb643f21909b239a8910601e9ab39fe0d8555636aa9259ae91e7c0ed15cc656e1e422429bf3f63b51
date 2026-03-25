const tape = require('tape')
const xargv = require('./')

tape('basic', function (t) {
  t.same(xargv(['node', 'app.js', "a1='a", "b'", 'a2', "'c", "d'", "'e", 'e'], true), ['node', 'app.js', 'a1=a b', 'a2', 'c d', "'e", 'e'])
  t.same(xargv(['node', 'app.js', "'foo", 'bar', "baz'"], true), ['node', 'app.js', 'foo bar baz'])
  t.same(xargv(['node', "app's"], true), ['node', "app's"])
  t.same(xargv(['a', 'b', 'c'], true), ['a', 'b', 'c'])
  t.end()
})
