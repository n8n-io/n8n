var assert = require('assert')
var series = require('./')

var a, b, c

series([
  function (done) {
    a = 1
    process.nextTick(done)
    check('a')
  },
  function (done) {
    b = 2
    process.nextTick(done)
    check('b')
  },
  function (done) {
    c = 3
    process.nextTick(done)
    check('c')
  }
], function (err) {
  assert.ifError(err)
  assert.equal(a, 1)
  assert.equal(b, 2)
  assert.equal(c, 3)
})

function check(x) {
  switch (x) {
    case 'a':
      assert.equal(a, 1)
      assert.equal(b, undefined)
      assert.equal(c, undefined)
      break
    case 'b':
      assert.equal(a, 1)
      assert.equal(b, 2)
      assert.equal(c, undefined)
      break
    case 'c':
      assert.equal(a, 1)
      assert.equal(b, 2)
      assert.equal(c, 3)
      break
  }
}

var context = 'hello'
series([function (done) {
  assert.equal(this, context)
  done()
}], context)

var finished
series([], function (err) {
  finished = true
})

process.nextTick(function () {
  if (!finished)
    throw new Error('Failed with no functions.');
})

var r, d, o
series([
  function (done) {
    r = 1
    process.nextTick(done)
  },
  function (done) {
    d = 0
    process.nextTick(function () {
      done(new Error('message'))
    })
  },
  function (done) {
    o = 0
    process.nextTick(done)
  }
], function (err) {
  assert.equal(err.message, 'message')
  assert.equal(r, 1)
  assert.equal(d, 0)
  assert.equal(o, undefined)
})

console.log('Array series tests pass!')