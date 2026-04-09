/* eslint-env mocha */

var times = require('lowscore/times')
var limiter = require('..')
var expect = require('chai').expect
var max = require('./max')

describe('promise-limit memory usage', function () {
  var memoryProfile

  beforeEach(function () {
    memoryProfile = []
  })

  function checkMemory () {
    var memory = process.memoryUsage().heapUsed
    memoryProfile.push(memory)
  }

  function load (i) {
    checkMemory()
    return new Promise(function (resolve, reject) {
      setTimeout(resolve, 10)
    }).then(function () {
      checkMemory()
      var array = new Array(1024 * 1024)

      return {
        i: i,
        array: array
      }
    })
  }

  it("doesn't use too much memory", function () {
    this.timeout(20000)

    var limit = limiter(5)
    return Promise.all(times(1000, function (i) {
      return limit(function () {
        return load(i).then(function () {})
      })
    })).then(function () {
      var maxMemoryUsage = max(memoryProfile)
      expect(maxMemoryUsage).to.be.lessThan(2000 * 1024 * 1024)
    })
  })
})
