"use strict"

var maybe = require("../")
var assert = require("assert")
var Promise = global.Promise || require("promise")

describe("maybe", function () {
  it("should call the callback with result the promise is resolved to", function (done) {
    var f = function f (cb) {
      return maybe(cb, new Promise(function (resolve, reject) {
        process.nextTick(function () {
          return resolve("hi")
        })
      }))
    }

    f(function (err, result) {
      assert.ifError(err, "no error")
      assert.strictEqual(result, "hi")
      return done()
    })
  })

  it("should call the callback with the error the promise is rejected with", function (done) {
    var f = function f (cb) {
      return maybe(cb, new Promise(function (resolve, reject) {
        process.nextTick(function () {
          return reject(new Error("boom"))
        })
      }))
    }

    f(function (err, result) {
      assert(err, "we got an error")
      assert.strictEqual(result, undefined, "we got undefined result")
      assert(err instanceof Error, "error is an Error")
      assert.strictEqual(err.message, "boom", "error message is boom")
      return done()
    })
  })

  it("should return undefined when called with a callback", function () {
    var f = function f (cb) {
      return maybe(cb, new Promise(function (resolve, reject) {
        //...
      }))
    }

    var returnVal = f(function (err, result) {})
    assert.strictEqual(returnVal, undefined, "returned val is undefined")
  })

  it("should return the same promise when no callback is provided", function () {
    var p

    var f = function f (cb) {
      p = new Promise(function (resolve, reject) {
        process.nextTick(function () {
          return resolve("hi")
        })
      })
      return maybe(cb, p)
    }

    var returnVal = f()
    assert(p instanceof Promise, "returned val is a Promise")
    assert.strictEqual(returnVal, p, "returned val is same obj (not a new Promise)")
  })

  it("should allow errors thrown in the callback to be uncaught", function (done) {
    var mochaHandler

    // Temporarily remove Mocha's global error handling so we can
    // verify error is indeed uncaught by installing our own
    // global error handler.
    if (process.browser) {
      mochaHandler = global.onerror
      global.onerror = handleUncaughtException
    }
    else {
      mochaHandler = process.listeners("uncaughtException").pop()
      process.removeListener("uncaughtException", mochaHandler)
      process.once("uncaughtException", handleUncaughtException)
    }

    var f = function f (cb) {
      return maybe(cb, new Promise(function (resolve, reject) {
        process.nextTick(function () {
          return resolve("hi")
        })
      }))
    }

    f(function (err, result) {
      throw new Error("yep")
    })

    function handleUncaughtException (err) {
      // `err` is either an Error when running under Node, or a
      // string if running under a browser.
      var msg = err.message || err

      assert(msg.match(/\byep\b/), "got expected error")

      // Restore Mocha's global error handler.
      if (process.browser) {
        global.onerror = mochaHandler
      }
      else {
        process.on("uncaughtException", mochaHandler)
      }

      done()

      // Don't leak error to browser console
      return true
    }
  })

  it("should not let the callback be called more than once", function (done) {
    var f = function f (cb) {
      return maybe(cb, new Promise(function (resolve, reject) {
        process.nextTick(function () {
          resolve("foo")
        })
      }))
    }

    var called = 0
    f(function (err, result) {
      called++
      assert(called <= 1, "called only once")
      setTimeout(function () { done() }, 100)
      return Promise.reject(new Error("bah"))
    })
  })
})
