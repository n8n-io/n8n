'use strict'

const test = require('tape')
const retimer = require('./')

test('schedule a callback', function (t) {
  t.plan(1)

  const start = Date.now()

  retimer(function () {
    t.ok(Date.now() - start >= 50, 'it was deferred ok!')
  }, 50)
})

test('reschedule a callback', function (t) {
  t.plan(1)

  const start = Date.now()

  const timer = retimer(function () {
    t.ok(Date.now() - start >= 70, 'it was deferred ok!')
  }, 50)

  setTimeout(function () {
    timer.reschedule(50)
  }, 20)
})

test('reschedule multiple times', function (t) {
  t.plan(1)

  const start = Date.now()

  const timer = retimer(function () {
    t.ok(Date.now() - start >= 90, 'it was deferred ok!')
  }, 50)

  setTimeout(function () {
    timer.reschedule(50)
    setTimeout(function () {
      timer.reschedule(50)
    }, 20)
  }, 20)
})

test('clear a timer', function (t) {
  t.plan(1)

  const timer = retimer(function () {
    t.fail('the timer should never get called')
  }, 20)

  timer.clear()

  setTimeout(function () {
    t.pass('nothing happened')
  }, 50)
})

test('clear a timer after a reschedule', function (t) {
  t.plan(1)

  const timer = retimer(function () {
    t.fail('the timer should never get called')
  }, 20)

  setTimeout(function () {
    timer.reschedule(50)
    setTimeout(function () {
      timer.clear()
    }, 10)
  }, 10)

  setTimeout(function () {
    t.pass('nothing happened')
  }, 50)
})

test('can be rescheduled early', function (t) {
  t.plan(1)

  const start = Date.now()

  const timer = retimer(function () {
    t.ok(Date.now() - start <= 500, 'it was rescheduled!')
  }, 500)

  setTimeout(function () {
    timer.reschedule(10)
  }, 20)
})

test('can be rescheduled even if the timeout has already triggered', function (t) {
  t.plan(2)

  const start = Date.now()
  let count = 0

  const timer = retimer(function () {
    count++
    if (count === 1) {
      t.ok(Date.now() - start >= 20, 'it was triggered!')
      timer.reschedule(20)
    } else {
      t.ok(Date.now() - start >= 40, 'it was rescheduled!')
    }
  }, 20)
})

test('pass arguments to the callback', function (t) {
  t.plan(1)

  retimer(function (arg) {
    t.equal(arg, 42, 'argument matches')
  }, 50, 42)
})
