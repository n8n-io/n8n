var tape = require('tape')
var through = require('through2')
var stream = require('stream')
var shift = require('./')

tape('shifts next', function (t) {
  var passthrough = through()

  passthrough.write('hello')
  passthrough.write('world')

  t.same(shift(passthrough), Buffer.from('hello'))
  t.same(shift(passthrough), Buffer.from('world'))
  t.end()
})

tape('shifts next with core', function (t) {
  var passthrough = stream.PassThrough()

  passthrough.write('hello')
  passthrough.write('world')

  t.same(shift(passthrough), Buffer.from('hello'))
  t.same(shift(passthrough), Buffer.from('world'))
  t.end()
})

tape('shifts next with object mode', function (t) {
  var passthrough = through({objectMode: true})

  passthrough.write({hello: 1})
  passthrough.write({world: 1})

  t.same(shift(passthrough), {hello: 1})
  t.same(shift(passthrough), {world: 1})
  t.end()
})

tape('shifts next with object mode with core', function (t) {
  var passthrough = stream.PassThrough({objectMode: true})

  passthrough.write({hello: 1})
  passthrough.write({world: 1})

  t.same(shift(passthrough), {hello: 1})
  t.same(shift(passthrough), {world: 1})
  t.end()
})
