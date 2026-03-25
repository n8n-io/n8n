var assert = require('assert')
var parallel = require('./')

var a, b, c
parallel([
  function (done) {
    setTimeout(function () {
      done(null, a = 0)
    }, 5)
  },
  function (done) {
    setTimeout(function () {
      done(null, b = 1)
    }, 10)
  },
  function (done) {
    setTimeout(function () {
      done(null, c = 2)
    }, 15)
  }
], function (err, results) {
  assert.equal(a, 0)
  assert.equal(b, 1)
  assert.equal(c, 2)

  assert.deepEqual(results, [0, 1, 2])
})

var d, e
parallel([
  function (done) {
    setTimeout(function () {
      d = 1
      done(new Error('message'))
    }, 5)
  },
  function (done) {
    setTimeout(function () {
      e = 2
      done()
    }, 10)
  }
], function (err) {
  assert.equal(err.message, 'message')
  assert.equal(d, 1)
  assert.equal(e, undefined)
})

var context = 'hello'
parallel([function (done) {
  assert.equal(this, context)
}], context)

var f
parallel([function (done) {
  f = true
  done()
}])

process.nextTick(function () {
  assert.equal(f, true)
})