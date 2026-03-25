'use strict'

const os = require('os')
const path = require('path')
const test = require('tap').test
const initJob = require('../lib/init')
const defaultOptions = require('../lib/defaultOptions')
const helper = require('./helper')
const server = helper.startServer()

test('init', (t) => {
  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: 2,
    title: 'title321'
  }, function (err, result) {
    t.error(err)

    t.ok(result.duration >= 2, 'duration is at least 2s')
    t.equal(result.title, 'title321', 'title should be what was passed in')
    t.equal(result.connections, 2, 'connections is the same')
    t.equal(result.pipelining, 1, 'pipelining is the default')

    t.ok(result.latency, 'latency exists')
    t.type(result.latency.average, 'number', 'latency.average exists')
    t.type(result.latency.stddev, 'number', 'latency.stddev exists')
    t.ok(result.latency.min >= 0, 'latency.min exists')
    t.type(result.latency.max, 'number', 'latency.max exists')
    t.type(result.latency.p2_5, 'number', 'latency.p2_5 (2.5%) exists')
    t.type(result.latency.p50, 'number', 'latency.p50 (50%) exists')
    t.type(result.latency.p97_5, 'number', 'latency.p97_5 (97.5%) exists')
    t.type(result.latency.p99, 'number', 'latency.p99 (99%) exists')

    t.ok(result.requests, 'requests exists')
    t.type(result.requests.average, 'number', 'requests.average exists')
    t.type(result.requests.stddev, 'number', 'requests.stddev exists')
    t.type(result.requests.min, 'number', 'requests.min exists')
    t.type(result.requests.max, 'number', 'requests.max exists')
    t.ok(result.requests.total >= result.requests.average * 2 / 100 * 95, 'requests.total exists')
    t.type(result.requests.sent, 'number', 'sent exists')
    t.ok(result.requests.sent >= result.requests.total, 'total requests made should be more than or equal to completed requests total')
    t.type(result.requests.p1, 'number', 'requests.p1 (1%) exists')
    t.type(result.requests.p2_5, 'number', 'requests.p2_5 (2.5%) exists')
    t.type(result.requests.p50, 'number', 'requests.p50 (50%) exists')
    t.type(result.requests.p97_5, 'number', 'requests.p97_5 (97.5%) exists')

    t.ok(result.throughput, 'throughput exists')
    t.type(result.throughput.average, 'number', 'throughput.average exists')
    t.type(result.throughput.stddev, 'number', 'throughput.stddev exists')
    t.type(result.throughput.min, 'number', 'throughput.min exists')
    t.type(result.throughput.max, 'number', 'throughput.max exists')
    t.ok(result.throughput.total >= result.throughput.average * 2 / 100 * 95, 'throughput.total exists')
    t.type(result.throughput.p1, 'number', 'throughput.p1 (1%) exists')
    t.type(result.throughput.p2_5, 'number', 'throughput.p2_5 (2.5%) exists')
    t.type(result.throughput.p50, 'number', 'throughput.p50 (50%) exists')
    t.type(result.throughput.p97_5, 'number', 'throughput.p97_5 (97.5%) exists')

    t.ok(result.start, 'start time exists')
    t.ok(result.finish, 'finish time exists')

    t.equal(result.errors, 0, 'no errors')
    t.equal(result.mismatches, 0, 'no mismatches')
    t.equal(result.resets, 0, 'no resets')

    t.equal(result['1xx'], 0, '1xx codes')
    t.equal(result['2xx'], result.requests.total, '2xx codes')
    t.equal(result['3xx'], 0, '3xx codes')
    t.equal(result['4xx'], 0, '4xx codes')
    t.equal(result['5xx'], 0, '5xx codes')
    t.equal(result.non2xx, 0, 'non 2xx codes')

    t.end()
  })
})

test('tracker.stop()', (t) => {
  const tracker = initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: 2
  }, function (err, result) {
    t.error(err)

    t.ok(result.duration < 5, 'duration is lower because of stop')
    t.notOk(result.title, 'title should not exist when not passed in')
    t.equal(result.connections, 2, 'connections is the same')
    t.equal(result.pipelining, 1, 'pipelining is the default')

    t.ok(result.latency, 'latency exists')
    t.type(result.latency.average, 'number', 'latency.average exists')
    t.type(result.latency.stddev, 'number', 'latency.stddev exists')
    t.ok(result.latency.min >= 0, 'latency.min exists')
    t.type(result.latency.max, 'number', 'latency.max exists')
    t.type(result.latency.p2_5, 'number', 'latency.p2_5 (2.5%) exists')
    t.type(result.latency.p50, 'number', 'latency.p50 (50%) exists')
    t.type(result.latency.p97_5, 'number', 'latency.p97_5 (97.5%) exists')
    t.type(result.latency.p99, 'number', 'latency.p99 (99%) exists')

    t.ok(result.requests, 'requests exists')
    t.type(result.requests.average, 'number', 'requests.average exists')
    t.type(result.requests.stddev, 'number', 'requests.stddev exists')
    t.type(result.requests.min, 'number', 'requests.min exists')
    t.type(result.requests.max, 'number', 'requests.max exists')
    t.ok(result.requests.total >= result.requests.average * 2 / 100 * 95, 'requests.total exists')
    t.type(result.requests.sent, 'number', 'sent exists')
    t.ok(result.requests.sent >= result.requests.total, 'total requests made should be more than or equal to completed requests total')
    t.type(result.requests.p1, 'number', 'requests.p1 (1%) exists')
    t.type(result.requests.p2_5, 'number', 'requests.p2_5 (2.5%) exists')
    t.type(result.requests.p50, 'number', 'requests.p50 (50%) exists')
    t.type(result.requests.p97_5, 'number', 'requests.p97_5 (97.5%) exists')

    t.ok(result.throughput, 'throughput exists')
    t.type(result.throughput.average, 'number', 'throughput.average exists')
    t.type(result.throughput.stddev, 'number', 'throughput.stddev exists')
    t.type(result.throughput.min, 'number', 'throughput.min exists')
    t.type(result.throughput.max, 'number', 'throughput.max exists')
    t.ok(result.throughput.total >= result.throughput.average * 2 / 100 * 95, 'throughput.total exists')
    t.type(result.throughput.p1, 'number', 'throughput.p1 (1%) exists')
    t.type(result.throughput.p2_5, 'number', 'throughput.p2_5 (2.5%) exists')
    t.type(result.throughput.p50, 'number', 'throughput.p50 (50%) exists')
    t.type(result.throughput.p97_5, 'number', 'throughput.p97_5 (97.5%) exists')

    t.ok(result.start, 'start time exists')
    t.ok(result.finish, 'finish time exists')

    t.equal(result.errors, 0, 'no errors')
    t.equal(result.mismatches, 0, 'no mismatches')

    t.equal(result['1xx'], 0, '1xx codes')
    t.equal(result['2xx'], result.requests.total, '2xx codes')
    t.equal(result['3xx'], 0, '3xx codes')
    t.equal(result['4xx'], 0, '4xx codes')
    t.equal(result['5xx'], 0, '5xx codes')
    t.equal(result.non2xx, 0, 'non 2xx codes')

    t.end()
  })

  t.ok(tracker.opts, 'opts exist on tracker')

  setTimeout(() => {
    tracker.stop()
  }, 1000)
})

test('requests.min should be 0 when there are no successful requests', (t) => {
  initJob({
    url: 'nonexistent',
    connections: 1,
    amount: 1
  }, function (err, result) {
    t.error(err)
    t.equal(result.requests.min, 0, 'requests.min should be 0')
    t.end()
  })
})

test('run should callback with an error with an invalid connections factor', (t) => {
  t.plan(2)

  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: -1
  }, function (err, result) {
    t.ok(err, 'invalid connections should cause an error')
    t.notOk(result, 'results should not exist')
    t.end()
  })
})

test('run should callback with an error with an invalid pipelining factor', (t) => {
  t.plan(2)

  initJob({
    url: 'http://localhost:' + server.address().port,
    pipelining: -1
  }, function (err, result) {
    t.ok(err, 'invalid pipelining should cause an error')
    t.notOk(result, 'results should not exist')
    t.end()
  })
})

test('run should callback with an error with an invalid bailout', (t) => {
  t.plan(2)

  initJob({
    url: 'http://localhost:' + server.address().port,
    bailout: -1
  }, function (err, result) {
    t.ok(err, 'invalid bailout should cause an error')
    t.notOk(result, 'results should not exist')
    t.end()
  })
})

test('run should callback with an error with an invalid duration', (t) => {
  t.plan(2)

  initJob({
    url: 'http://localhost:' + server.address().port,
    duration: -1
  }, function (err, result) {
    t.ok(err, 'invalid duration should cause an error')
    t.notOk(result, 'results should not exist')
    t.end()
  })
})

test('run should callback with an error when no url is passed in', (t) => {
  t.plan(2)

  initJob({}, function (err, result) {
    t.ok(err, 'no url should cause an error')
    t.notOk(result, 'results should not exist')
    t.end()
  })
})

test('run should callback with an error after a bailout', (t) => {
  t.plan(2)

  initJob({
    url: 'http://localhost:4', // 4 = first unassigned port: https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers
    bailout: 1
  }, function (err, result) {
    t.error(err)
    t.ok(result, 'results should not exist')
    t.end()
  })
})

test('run should callback with an error using expectBody and requests', (t) => {
  t.plan(2)

  initJob({
    url: 'http://localhost:' + server.address().port,
    requests: [{ body: 'something' }],
    expectBody: 'hello'
  }, function (err, result) {
    t.ok(err, 'expectBody used with requests should cause an error')
    t.notOk(result, 'results should not exist')
    t.end()
  })
})

test('run should handle context correctly', (t) => {
  t.plan(1)

  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 1,
    amount: 1,
    initialContext: { init: 'context' },
    requests: [{
      setupRequest: (req, context) => {
        t.same(context, { init: 'context' }, 'context should be initialized from opts')
        return req
      }
    }]
  })
})

test('run should allow users to enter timestrings to be used for duration', (t) => {
  t.plan(3)

  const instance = initJob({
    url: 'http://localhost:' + server.address().port,
    duration: '10m'
  }, function (err, result) {
    t.error(err)
    t.ok(result, 'results should exist')
    t.end()
  })

  t.equal(instance.opts.duration, 10 * 60, 'duration should have been parsed to be 600 seconds (10m)')

  setTimeout(() => {
    instance.stop()
  }, 500)
})

test('run should recognise valid urls without http at the start', (t) => {
  t.plan(3)

  initJob({
    url: 'localhost:' + server.address().port,
    duration: 1
  }, (err, res) => {
    t.error(err)
    t.ok(res, 'results should exist')
    t.equal(res.url, 'http://localhost:' + server.address().port, 'url should have http:// added to start')
    t.end()
  })
})

test('run should produce count of mismatches with expectBody set', (t) => {
  t.plan(2)

  initJob({
    url: 'http://localhost:' + server.address().port,
    expectBody: 'body will not be this',
    maxOverallRequests: 10,
    timeout: 100
  }, function (err, result) {
    t.error(err)
    t.equal(result.mismatches, 10)
    t.end()
  })
})

test('run should produce 0 mismatches with expectBody set and matches', (t) => {
  t.plan(2)

  const responseBody = 'hello dave'
  const server = helper.startServer({ body: responseBody })

  initJob({
    url: 'http://localhost:' + server.address().port,
    expectBody: responseBody,
    maxOverallRequests: 10
  }, function (err, result) {
    t.error(err)
    t.equal(result.mismatches, 0)
    t.end()
  })
})

test('run should produce count of mismatches with verifyBody set', (t) => {
  t.plan(2)

  initJob({
    url: 'http://localhost:' + server.address().port,
    verifyBody: function () {
      return false
    },
    maxOverallRequests: 10,
    timeout: 100
  }, function (err, result) {
    t.error(err)
    t.equal(result.mismatches, 10)
    t.end()
  })
})

test('run should produce 0 mismatches with verifyBody set and return true', (t) => {
  t.plan(2)

  const responseBody = 'hello dave'
  const server = helper.startServer({ body: responseBody })

  initJob({
    url: 'http://localhost:' + server.address().port,
    verifyBody: function (body) {
      return body.indexOf('hello') > -1
    },
    maxOverallRequests: 10
  }, function (err, result) {
    t.error(err)
    t.equal(result.mismatches, 0)
    t.end()
  })
})

test('run should accept a unix socket/windows pipe', (t) => {
  t.plan(11)

  const socketPath = process.platform === 'win32'
    ? path.join('\\\\?\\pipe', process.cwd(), 'autocannon-' + Date.now())
    : path.join(os.tmpdir(), 'autocannon-' + Date.now() + '.sock')

  helper.startServer({ socketPath })

  initJob({
    url: 'localhost',
    socketPath,
    connections: 2,
    duration: 2
  }, (err, result) => {
    t.error(err)
    t.ok(result, 'results should exist')
    t.equal(result.socketPath, socketPath, 'socketPath should be included in result')
    t.ok(result.requests.total > 0, 'should make at least one request')

    if (process.platform === 'win32') {
      // On Windows a few errors are expected. We'll accept a 1% error rate on
      // the pipe.
      t.ok(result.errors / result.requests.total < 0.01, `should have less than 1% errors on Windows (had ${result.errors} errors)`)
    } else {
      t.equal(result.errors, 0, 'no errors')
    }

    t.equal(result['1xx'], 0, '1xx codes')
    t.equal(result['2xx'], result.requests.total, '2xx codes')
    t.equal(result['3xx'], 0, '3xx codes')
    t.equal(result['4xx'], 0, '4xx codes')
    t.equal(result['5xx'], 0, '5xx codes')
    t.equal(result.non2xx, 0, 'non 2xx codes')
    t.end()
  })
})

for (let i = 1; i <= 5; i++) {
  test(`run should count all ${i}xx status codes`, (t) => {
    const server = helper.startServer({ statusCode: i * 100 + 2 })

    initJob({
      url: `http://localhost:${server.address().port}`,
      connections: 2,
      duration: 2
    }, (err, result) => {
      t.error(err)

      t.ok(result[`${i}xx`], `${i}xx status codes recorded`)

      t.ok(result.latency, 'latency exists')
      t.ok(!Number.isNaN(result.latency.average), 'latency.average is not NaN')
      t.type(result.latency.average, 'number', 'latency.average exists')
      t.type(result.latency.stddev, 'number', 'latency.stddev exists')
      t.ok(result.latency.min >= 0, 'latency.min exists')
      t.type(result.latency.max, 'number', 'latency.max exists')
      t.type(result.latency.p2_5, 'number', 'latency.p2_5 (2.5%) exists')
      t.type(result.latency.p50, 'number', 'latency.p50 (50%) exists')
      t.type(result.latency.p97_5, 'number', 'latency.p97_5 (97.5%) exists')
      t.type(result.latency.p99, 'number', 'latency.p99 (99%) exists')

      t.ok(result.throughput, 'throughput exists')
      t.ok(!Number.isNaN(result.throughput.average), 'throughput.average is not NaN')
      t.type(result.throughput.average, 'number', 'throughput.average exists')
      t.type(result.throughput.stddev, 'number', 'throughput.stddev exists')
      t.type(result.throughput.min, 'number', 'throughput.min exists')
      t.type(result.throughput.max, 'number', 'throughput.max exists')
      t.ok(result.throughput.total >= result.throughput.average * 2 / 100 * 95, 'throughput.total exists')
      t.type(result.throughput.p1, 'number', 'throughput.p1 (1%) exists')
      t.type(result.throughput.p2_5, 'number', 'throughput.p2_5 (2.5%) exists')
      t.type(result.throughput.p50, 'number', 'throughput.p50 (50%) exists')
      t.type(result.throughput.p97_5, 'number', 'throughput.p97_5 (97.5%) exists')

      t.end()
    })
  })
}

test('run should not modify default options', (t) => {
  const origin = Object.assign({}, defaultOptions)
  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: 2
  }, function (err, result) {
    t.error(err)
    t.same(defaultOptions, origin, 'calling run function does not modify default options')
    t.end()
  })
})

test('run will exclude non 2xx stats from latency and throughput averages if excludeErrorStats is true', (t) => {
  const server = helper.startServer({ statusCode: 404 })

  initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 2,
    duration: 2,
    excludeErrorStats: true
  }, (err, result) => {
    t.error(err)

    t.equal(result['1xx'], 0, '1xx codes')
    t.equal(result['2xx'], 0, '2xx codes')
    t.equal(result['3xx'], 0, '3xx codes')
    t.equal(result['4xx'], result.requests.total, '4xx codes')
    t.equal(result['5xx'], 0, '5xx codes')
    t.equal(result.non2xx, result.requests.total, 'non 2xx codes')

    t.ok(result.latency, 'latency exists')
    t.equal(result.latency.average, 0, 'latency.average should be 0')
    t.equal(result.latency.stddev, 0, 'latency.stddev should be 0')
    t.equal(result.latency.min, 0, 'latency.min should be 0')
    t.equal(result.latency.max, 0, 'latency.max should be 0')
    t.equal(result.latency.p1, 0, 'latency.p1 (1%) should be 0')
    t.equal(result.latency.p2_5, 0, 'latency.p2_5 (2.5%) should be 0')
    t.equal(result.latency.p50, 0, 'latency.p50 (50%) should be 0')
    t.equal(result.latency.p97_5, 0, 'latency.p97_5 (97.5%) should be 0')
    t.equal(result.latency.p99, 0, 'latency.p99 (99%) should be 0')

    t.ok(result.throughput, 'throughput exists')
    t.equal(result.throughput.average, 0, 'throughput.average should be 0')
    t.equal(result.throughput.stddev, 0, 'throughput.stddev should be 0')
    t.equal(result.throughput.min, 0, 'throughput.min should be 0')
    t.equal(result.throughput.max, 0, 'throughput.max should be 0')
    t.equal(result.throughput.total, 0, 'throughput.total should be 0')
    t.equal(result.throughput.p1, 0, 'throughput.p1 (1%) should be 0')
    t.equal(result.throughput.p2_5, 0, 'throughput.p2_5 (2.5%) should be 0')
    t.equal(result.throughput.p50, 0, 'throughput.p50 (50%) should be 0')
    t.equal(result.throughput.p97_5, 0, 'throughput.p97_5 (97.5%) should be 0')

    t.end()
  })
})

test('tracker will emit reqError with error message on timeout', (t) => {
  t.plan(2)

  const server = helper.startTimeoutServer()

  const tracker = initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 1,
    duration: 5,
    timeout: 2,
    bailout: 1,
    excludeErrorStats: true
  })

  tracker.once('reqError', (err) => {
    t.type(err, Error, 'reqError should pass an Error to listener')
    t.equal(err.message, 'request timed out', 'error should indicate timeout')
    tracker.stop()
  })
})

test('tracker will emit reqError with error message on error', (t) => {
  t.plan(1)

  const server = helper.startSocketDestroyingServer()

  const tracker = initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 10,
    duration: 15,
    method: 'POST',
    body: 'hello',
    excludeErrorStats: true
  })

  tracker.once('reqError', (err) => {
    console.log(err)
    t.type(err, Error, 'reqError should pass an Error to listener')
    tracker.stop()
  })
})

test('tracker will emit reqMismatch when body does not match expectBody', (t) => {
  t.plan(2)

  const responseBody = 'hello world'
  const server = helper.startServer({ body: responseBody })

  const expectBody = 'goodbye world'

  const tracker = initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 10,
    duration: 15,
    method: 'GET',
    body: 'hello',
    expectBody
  })

  tracker.once('reqMismatch', (bodyStr) => {
    t.equal(bodyStr, responseBody)
    t.not(bodyStr, expectBody)
    tracker.stop()
  })
})

test('tracker will emit tick with current counter value', (t) => {
  t.plan(1)

  const server = helper.startSocketDestroyingServer()

  const tracker = initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 10,
    duration: 10
  })

  tracker.once('tick', (counter) => {
    t.type(counter, 'object')
    tracker.stop()
  })
})

test('throw if connections is greater than amount', (t) => {
  t.plan(1)

  const server = helper.startSocketDestroyingServer()

  t.throws(function () {
    initJob({
      url: `http://localhost:${server.address().port}`,
      connections: 10,
      amount: 1,
      excludeErrorStats: true
    }, () => {})
  })
})

test('run promise', (t) => {
  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: 2,
    title: 'title321'
  }).then(result => {
    t.ok(result.duration >= 2, 'duration is at least 2s')
    t.equal(result.title, 'title321', 'title should be what was passed in')
    t.equal(result.connections, 2, 'connections is the same')
    t.equal(result.pipelining, 1, 'pipelining is the default')

    t.ok(result.latency, 'latency exists')
    t.type(result.latency.average, 'number', 'latency.average exists')
    t.type(result.latency.stddev, 'number', 'latency.stddev exists')
    t.ok(result.latency.min >= 0, 'latency.min exists')
    t.type(result.latency.max, 'number', 'latency.max exists')
    t.type(result.latency.p2_5, 'number', 'latency.p2_5 (2.5%) exists')
    t.type(result.latency.p50, 'number', 'latency.p50 (50%) exists')
    t.type(result.latency.p97_5, 'number', 'latency.p97_5 (97.5%) exists')
    t.type(result.latency.p99, 'number', 'latency.p99 (99%) exists')

    t.ok(result.requests, 'requests exists')
    t.type(result.requests.average, 'number', 'requests.average exists')
    t.type(result.requests.stddev, 'number', 'requests.stddev exists')
    t.type(result.requests.min, 'number', 'requests.min exists')
    t.type(result.requests.max, 'number', 'requests.max exists')
    t.ok(result.requests.total >= result.requests.average * 2 / 100 * 95, 'requests.total exists')
    t.type(result.requests.sent, 'number', 'sent exists')
    t.ok(result.requests.sent >= result.requests.total, 'total requests made should be more than or equal to completed requests total')
    t.type(result.requests.p1, 'number', 'requests.p1 (1%) exists')
    t.type(result.requests.p2_5, 'number', 'requests.p2_5 (2.5%) exists')
    t.type(result.requests.p50, 'number', 'requests.p50 (50%) exists')
    t.type(result.requests.p97_5, 'number', 'requests.p97_5 (97.5%) exists')

    t.ok(result.throughput, 'throughput exists')
    t.type(result.throughput.average, 'number', 'throughput.average exists')
    t.type(result.throughput.stddev, 'number', 'throughput.stddev exists')
    t.type(result.throughput.min, 'number', 'throughput.min exists')
    t.type(result.throughput.max, 'number', 'throughput.max exists')
    t.ok(result.throughput.total >= result.throughput.average * 2 / 100 * 95, 'throughput.total exists')
    t.type(result.throughput.p1, 'number', 'throughput.p1 (1%) exists')
    t.type(result.throughput.p2_5, 'number', 'throughput.p2_5 (2.5%) exists')
    t.type(result.throughput.p50, 'number', 'throughput.p50 (50%) exists')
    t.type(result.throughput.p97_5, 'number', 'throughput.p97_5 (97.5%) exists')

    t.ok(result.start, 'start time exists')
    t.ok(result.finish, 'finish time exists')

    t.equal(result.errors, 0, 'no errors')
    t.equal(result.resets, 0, 'no resets')

    t.equal(result['1xx'], 0, '1xx codes')
    t.equal(result['2xx'], result.requests.total, '2xx codes')
    t.equal(result['3xx'], 0, '3xx codes')
    t.equal(result['4xx'], 0, '4xx codes')
    t.equal(result['5xx'], 0, '5xx codes')
    t.equal(result.non2xx, 0, 'non 2xx codes')

    t.end()
  })
})

test('should throw if duration is not a number nor a string', t => {
  t.plan(1)
  const server = helper.startServer()
  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: ['foobar'],
    title: 'title321'
  })
    .then((result) => {
      t.fail()
    })
    .catch((err) => {
      t.equal(err.message, 'duration entered was in an invalid format')
    })
})

test('should emit error', t => {
  t.plan(1)
  const server = helper.startServer()
  const tracker = initJob({
    url: `http://unknownhost:${server.address().port}`,
    connections: 1,
    timeout: 100,
    forever: true,
    form: {
      param1: {
        type: 'string',
        value: null // this will trigger an error
      }
    }
  })

  tracker.once('error', (error) => {
    t.equal(error.message, 'A \'type\' key with value \'text\' or \'file\' should be specified')
    t.end()
  })
})

test('should throw if timeout is less than zero', t => {
  t.plan(1)
  const server = helper.startServer()
  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    timeout: -1,
    title: 'title321'
  })
    .then((result) => {
      t.fail()
    })
    .catch((err) => {
      t.equal(err.message, 'timeout must be greater than 0')
    })
})

test('should handle duration in string format', t => {
  t.plan(1)
  const server = helper.startServer()
  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    duration: '1',
    title: 'title321'
  }).then((result) => {
    t.pass()
  })
})

test('should count resets', t => {
  t.plan(1)
  const server = helper.startServer()
  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 1,
    amount: 10,
    requests: [
      { method: 'GET' },
      { method: 'PUT' },
      {
        method: 'POST',
        // falsey result will reset
        setupRequest: () => {}
      }
    ]
  }).then((result) => {
    t.equal(result.resets, 4)
    t.end()
  })
})

test('should get onResponse callback invoked even when there is no body', async t => {
  t.plan(4)
  const server = helper.startServer({ responses: [{ statusCode: 200, body: 'ok' }, { statusCode: 204 }] })

  await initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 1,
    amount: 2,
    requests: [
      {
        method: 'GET',
        onResponse (status, body) {
          t.same(status, 200)
          t.same(body, 'ok')
        }
      },
      {
        method: 'GET',
        onResponse (status, body) {
          t.same(status, 204)
          t.same(body, '')
        }
      }
    ]
  })

  t.end()
})

test('should use request from HAR', (t) => {
  t.plan(6)
  const server = helper.startServer()
  const url = `http://localhost:${server.address().port}`
  const har = helper.customizeHAR('./fixtures/httpbin-get.json', 'https://httpbin.org', url)

  initJob({
    url,
    duration: 1,
    har
  }, (err, res) => {
    t.error(err)
    t.ok(res, 'results should exist')
    t.equal(res.errors, 0)
    t.equal(res.timeouts, 0)
    t.ok(res['2xx'] > 0)
    t.equal(res.url, url)
    t.end()
  })
})

test('should use extend headers of HAR requests', (t) => {
  t.plan(6 + 2) // header check done as many times as sent requests
  const server = helper.startServer()
  const url = `http://localhost:${server.address().port}`
  const har = helper.customizeHAR('./fixtures/httpbin-simple-get.json', 'https://httpbin.org', url)

  initJob({
    url,
    connections: 1,
    amount: 2,
    headers: { 'X-CUSTOM': 'my-own-value' },
    har
  }, (err, res) => {
    t.error(err)
    t.ok(res, 'results should exist')
    t.equal(res.errors, 0)
    t.equal(res.timeouts, 0)
    t.ok(res['2xx'] > 0)
    t.equal(res.url, url)
    t.end()
  }).on('response', (client) => {
    t.equal(client.requestIterator.currentRequest.headers['X-CUSTOM'], 'my-own-value', 'X-CUSTOM was not sent to server')
  })
})

test('should not override method or body of HAR requests', (t) => {
  t.plan(6 + 4) // method and body checks done as many times as sent requests
  const server = helper.startServer()
  const url = `http://localhost:${server.address().port}`
  const har = helper.customizeHAR('./fixtures/httpbin-simple-get.json', 'https://httpbin.org', url)

  initJob({
    url,
    connections: 1,
    amount: 2,
    method: 'POST',
    body: 'my-custom-body',
    har
  }, (err, res) => {
    t.error(err)
    t.ok(res, 'results should exist')
    t.equal(res.errors, 0)
    t.equal(res.timeouts, 0)
    t.ok(res['2xx'] > 0)
    t.equal(res.url, url)
    t.end()
  }).on('response', (client) => {
    t.equal(client.requestIterator.currentRequest.method, 'GET', 'Method was not mean to be overidden')
    t.equal(client.requestIterator.currentRequest.body, undefined, 'Body was not mean to be overidden')
  })
})

test('should ignore HAR requests targetting a different domain', (t) => {
  t.plan(6)
  const server = helper.startServer()
  const url = `http://localhost:${server.address().port}`
  const har = helper.customizeHAR('./fixtures/multi-domains.json', 'https://httpbin.org', url)

  initJob({
    url,
    connections: 1,
    amount: 4,
    har
  }, (err, res) => {
    t.error(err)
    t.ok(res, 'results should exist')
    t.equal(res.errors, 0)
    t.equal(res.timeouts, 0)
    // if the github request is fired, it'll fail with 4xx status
    t.equal(res['2xx'], 4)
    t.equal(res.url, url)
    t.end()
  })
})

test('should throw on invalid HAR', (t) => {
  t.plan(1)

  initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 1,
    amount: 4,
    har: {
      log: {
        version: '1.2',
        creator: {
          name: 'Firefox',
          version: '80.0.1'
        },
        pages: [
          {
            startedDateTime: '2020-09-28T16:43:28.987+02:00',
            id: 'page_1',
            title: 'mcollina/autocannon: fast HTTP/1.1 benchmarking tool written in Node.js',
            pageTimings: {
              onContentLoad: 1234,
              onLoad: 1952
            }
          }
        ]
      }
    }
  }, (err, res) => {
    t.match(err, /Could not parse HAR content: no entries found/)
    t.end()
  })
})

test('should run when no callback is passed in', (t) => {
  t.plan(1)

  const tracker = initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 1,
    duration: 1
  })
  t.resolveMatch(tracker, { connections: 1 }, 'The main tracker should resolve')
})

test('Should run a warmup if one is passed in', (t) => {
  t.plan(1)

  const tracker = initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 1,
    duration: 1,
    warmup: {
      connections: 1,
      duration: 1
    }
  })
  t.resolves(tracker, 'The main tracker should resolve')
})

test('The warmup should not pollute the main result set', (t) => {
  t.plan(3)

  const tracker = initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 3,
    duration: 1,
    warmup: {
      connections: 4,
      duration: 2
    }
  })
  tracker.then((result) => {
    t.equal(result.connections, 3, 'connections should equal the main connections and not the warmup connections')
    t.ok(result.duration >= 1, 'duration should equal the main duration and not the warmup duration')
    t.type(result.warmup, 'object')
  })
})

test('should get headers passed from server onResponse callback', async t => {
  t.plan(3)
  const server = helper.startServer({ responses: [{ statusCode: 200, body: 'ok', headers: { 'set-cookie': 123 } }] })

  await initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 1,
    amount: 1,
    requests: [
      {
        method: 'GET',
        onResponse (status, body, context, headers) {
          t.same(status, 200)
          t.same(body, 'ok')
          t.same(headers['set-cookie'], 123)
        }
      }
    ]
  })

  t.end()
})

test('should get multi-value headers passed from server onResponse callback', async t => {
  t.plan(3)
  const server = helper.startServer({ responses: [{ statusCode: 200, body: 'ok', headers: { 'set-cookie': [123, 456, 789] } }] })

  await initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 1,
    amount: 1,
    requests: [
      {
        method: 'GET',
        onResponse (status, body, context, headers) {
          t.same(status, 200)
          t.same(body, 'ok')
          t.same(headers['set-cookie'], [123, 456, 789])
        }
      }
    ]
  })

  t.end()
})
