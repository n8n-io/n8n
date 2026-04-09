/* eslint-env mocha */

var times = require('lowscore/times')
var range = require('lowscore/range')
var limiter = require('..')
var chai = require('chai')
var expect = chai.expect
chai.use(require('chai-as-promised'))
var max = require('./max')

describe('promise-limit', function () {
  var output

  beforeEach(function () {
    output = []
  })

  function wait (text, n) {
    output.push('starting', text)

    return new Promise(function (resolve) {
      setTimeout(resolve, n)
    }).then(function () {
      output.push('finished', text)
      return text
    })
  }

  function expectMaxOutstanding (n) {
    var outstanding = 0

    var outstandingOverTime = output.map(function (line) {
      if (line.match(/starting/)) {
        outstanding++
      } else if (line.match(/finished/)) {
        outstanding--
      }

      return outstanding
    })

    var maxOutstanding = max(outstandingOverTime)
    expect(maxOutstanding).to.equal(n)
  }

  it('limits the number of outstanding calls to a function', function () {
    var limit = limiter(5)

    return Promise.all(times(9, function (i) {
      return limit(function () {
        return wait('job ' + (i + 1), 100)
      })
    })).then(function () {
      expectMaxOutstanding(5)
    })
  })

  it("doesn't limit if the number outstanding is the limit", function () {
    var limit = limiter(5)

    return Promise.all(times(5, function (i) {
      return limit(function () {
        return wait('job ' + (i + 1), 100)
      })
    })).then(function () {
      expectMaxOutstanding(5)
    })
  })

  it("doesn't limit if the number outstanding less than the limit", function () {
    var limit = limiter(5)

    return Promise.all(times(4, function (i) {
      return limit(function () {
        return wait('job ' + (i + 1), 100)
      })
    })).then(function () {
      expectMaxOutstanding(4)
    })
  })

  it('returns the results from each job', function () {
    var limit = limiter(5)

    return Promise.all(times(9, function (i) {
      return limit(function () {
        return wait('job ' + (i + 1), 100)
      })
    })).then(function (results) {
      expect(results).to.eql(times(9, function (i) {
        return 'job ' + (i + 1)
      }))
    })
  })

  it('returns a rejected promise if the function throws an error', function () {
    var limit = limiter(5)

    var promise = limit(function () {
      throw new Error('uh oh')
    })
    expect(promise).to.be.a('promise')
    return promise.then(function () {
      throw new Error('the promise resolved, instead of rejecting')
    }).catch(function (err) {
      expect(String(err)).to.equal('Error: uh oh')
    })
  })

  it('should fulfil or reject when the function fulfils or rejects', function () {
    var limit = limiter(2)

    var numbers = [1, 2, 3, 4, 5, 6]

    function rejectOdd (n) {
      return new Promise(function (resolve, reject) {
        if (n % 2 === 0) {
          resolve(n + ' is even')
        } else {
          reject(new Error(n + ' is odd'))
        }
      })
    }

    return Promise.all(numbers.map(function (i) {
      return limit(function () {
        return rejectOdd(i)
      }).then(function (r) {
        return 'pass: ' + r
      }, function (e) {
        return 'fail: ' + e.message
      })
    })).then(function (results) {
      expect(results).to.eql([
        'fail: 1 is odd',
        'pass: 2 is even',
        'fail: 3 is odd',
        'pass: 4 is even',
        'fail: 5 is odd',
        'pass: 6 is even'
      ])
    })
  })

  describe('no limit', function () {
    function expectNoLimit (limit) {
      return Promise.all(times(9, function (i) {
        return limit(function () { return wait('job ' + (i + 1), 100) })
      })).then(function () {
        expectMaxOutstanding(9)
      }).then(function () {
        return expectNoMapLimit(limit)
      })
    }

    function expectNoMapLimit (limit) {
      return limit.map(range(0, 9), function (i) {
        return wait('job ' + (i + 1), 100)
      }).then(function () {
        expectMaxOutstanding(9)
      })
    }

    it("doesn't limit if the limit is 0", function () {
      var limit = limiter(0)

      return expectNoLimit(limit)
    })

    it("doesn't limit if the limit is undefined", function () {
      var limit = limiter()

      return expectNoLimit(limit)
    })
  })

  describe('map', function () {
    function failsAt1 (num) {
      if (num === 1) return Promise.reject(new Error('rejecting number ' + num))
      else return Promise.resolve('accepting number ' + num)
    }

    function resolvesAll (num) {
      return Promise.resolve('accepting number ' + num)
    }

    it('returns all results when all are resolved', function () {
      var limit = limiter(2)

      return limit.map([0, 1, 2, 3], resolvesAll).then(function (results) {
        expect(results).to.eql([
          'accepting number 0',
          'accepting number 1',
          'accepting number 2',
          'accepting number 3'
        ])
      })
    })

    it('returns first failure when one fails', function () {
      var limit = limiter(2)

      return expect(limit.map([0, 1, 2, 3], failsAt1)).to.be.rejectedWith('rejecting number 1')
    })

    it('limiter can still be used after map with failure', function () {
      var limit = limiter(2)

      return expect(limit.map([0, 1, 2, 3], failsAt1)).to.be.rejectedWith('rejecting number 1').then(function () {
        return limit.map([0, 1, 2, 3], resolvesAll).then(function (results) {
          expect(results).to.eql([
            'accepting number 0',
            'accepting number 1',
            'accepting number 2',
            'accepting number 3'
          ])
        })
      })
    })
  })

  describe('large numbers of tasks failing', function () {
    context('when error thrown', function () {
      function alwaysFails (n) {
        throw new Error('argh: ' + n)
      }

      it("doesn't exceed stack size", function () {
        var limit = limiter(2)

        return expect(limit.map(range(0, 1000), alwaysFails)).to.be.rejectedWith('argh: 0')
      })
    })

    context('when error rejected', function () {
      function alwaysFails (n) {
        return Promise.reject(new Error('argh: ' + n))
      }

      it("doesn't exceed stack size", function () {
        var limit = limiter(2)

        return expect(limit.map(range(0, 1000), alwaysFails)).to.be.rejectedWith('argh: 0')
      })
    })
  })

  describe('queue length', function () {
    it('updates the queue length when there are more jobs than there is concurrency', function () {
      var limit = limiter(2)

      var one = limit(function () { return wait('one', 10) })
      expect(limit.queue).to.equal(0)
      var two = limit(function () { return wait('two', 20) })
      expect(limit.queue).to.equal(0)
      limit(function () { return wait('three', 100) })
      expect(limit.queue).to.equal(1)
      limit(function () { return wait('four', 100) })
      expect(limit.queue).to.equal(2)

      return one.then(function () {
        expect(limit.queue).to.equal(1)

        return two.then(function () {
          expect(limit.queue).to.equal(0)
        })
      })
    })
  })
})
