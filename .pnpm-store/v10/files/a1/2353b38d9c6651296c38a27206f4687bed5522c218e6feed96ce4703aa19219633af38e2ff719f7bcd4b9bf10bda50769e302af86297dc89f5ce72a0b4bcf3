'use strict'

const path = require('path')
const fs = require('fs')
const test = require('tap').test
const http = require('http')
const initJob = require('../lib/init')
const { hasWorkerSupport } = require('../lib/util')
const helper = require('./helper')
const httpsServer = helper.startHttpsServer()

test('returns error when no worker support was found', (t) => {
  const server = helper.startServer()
  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 3,
    workers: 3,
    amount: 6,
    title: 'with-workers'
  }, function (err, result) {
    if (hasWorkerSupport) {
      t.error(err)
    } else {
      t.equal(err.message, 'Please use node >= 11.7.0 for workers support')
    }

    t.end()
  })
})

test('init with workers', { skip: !hasWorkerSupport }, (t) => {
  const server = helper.startServer()
  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 3,
    workers: 3,
    amount: 6,
    title: 'with-workers'
  }, function (err, result) {
    t.error(err)

    t.ok(result.workers === 3, 'correct worker count')
    t.equal(result.title, 'with-workers', 'title should be what was passed in')
    t.equal(result.connections, 3, 'connections is the same')
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
    t.ok(result.requests.total === 6, 'requests.total exists')
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
    t.type(result.throughput.total, 'number', 'throughput.total exists')
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

test('setupRequest and onResponse work with workers', { skip: !hasWorkerSupport }, (t) => {
  const server = http.createServer((req, res) => {
    // it's not easy to assert things within setupRequest and onResponse
    // when in workers mode. So, we set something in onResponse and use in the
    // next Request and make sure it exist or we return 404.
    if (req.method === 'GET' && req.url !== '/test-123?some=thing&bar=baz') {
      res.statusCode = 404
      res.end('NOT OK')
      return
    }

    res.end('OK')
  })
  server.listen(0)
  server.unref()

  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    amount: 4,
    workers: 1,
    requests: [
      {
        method: 'PUT',
        onResponse: path.join(__dirname, './utils/on-response')
      },
      {
        method: 'GET',
        setupRequest: path.join(__dirname, './utils/setup-request')
      }
    ]
  }, function (err, result) {
    t.error(err)

    t.equal(4, result['2xx'], 'should have 4 ok requests')
    t.equal(0, result['4xx'], 'should not have any 404s')
    t.end()
  })
})

test('verifyBody work with workers', { skip: !hasWorkerSupport }, (t) => {
  const server = http.createServer((req, res) => {
    // it's not easy to assert things within setupRequest and onResponse
    // when in workers mode. So, we set something in onResponse and use in the
    // next Request and make sure it exist or we return 404.
    if (req.method === 'GET' && req.url !== '/test-123?some=thing&bar=baz') {
      res.statusCode = 404
      res.end('NOT OK')
      return
    }

    res.end('OK')
  })
  server.listen(0)
  server.unref()

  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    amount: 4,
    workers: 1,
    verifyBody: path.join(__dirname, './utils/verify-body')
  }, function (err, result) {
    t.error(err)

    t.equal(4, result.mismatches, 'should have 4 mismatches requests')
    t.end()
  })
})

test('setupClient works with workers', { skip: !hasWorkerSupport }, (t) => {
  const server = http.createServer((req, res) => {
    if (req.headers.custom !== 'my-header') {
      res.statusCode = 404
      res.end('NOT OK')
      return
    }
    res.end('OK')
  })
  server.listen(0)
  server.unref()

  initJob({
    url: 'http://localhost:' + server.address().port,
    connections: 2,
    amount: 2,
    workers: 1,
    setupClient: path.join(__dirname, './utils/setup-client')
  }, function (err, result) {
    t.error(err)

    t.equal(2, result['2xx'], 'should have 2 ok requests')
    t.equal(0, result['4xx'], 'should not have any 404s')
    t.end()
  })
})

test('tlsOptions using pfx work as intended in workers', { skip: !hasWorkerSupport }, (t) => {
  initJob({
    url: 'https://localhost:' + httpsServer.address().port,
    connections: 1,
    amount: 1,
    workers: 2,
    tlsOptions: {
      pfx: fs.readFileSync(path.join(__dirname, '/keystore.pkcs12')),
      passphrase: 'test'
    }
  }, function (err, result) {
    t.error(err)
    t.ok(result, 'requests are ok')
    t.end()
  })
})
