const { test } = require('tap')
const { startServer } = require('./helper')
const autocannon = require('../autocannon')
const aggregateResult = autocannon.aggregateResult
const server = startServer()
const url = 'http://localhost:' + server.address().port

test('exec separate autocannon instances with skipAggregateResult, then aggregateResult afterwards', async (t) => {
  t.plan(2)

  const opts = {
    url,
    connections: 1,
    maxOverallRequests: 10,
    skipAggregateResult: true
  }

  const results = await Promise.all([
    autocannon(opts),
    autocannon(opts)
  ])

  const aggregateResults = aggregateResult(results, opts)

  t.equal(aggregateResults['2xx'], 20)
  t.equal(aggregateResults.requests.total, 20)
})

test('aggregateResult must be passed opts with at least a URL or socketPath property', async (t) => {
  t.plan(2)
  t.throws(() => aggregateResult([]), 'url or socketPath option required')
  t.throws(() => aggregateResult([], {}), 'url or socketPath option required')
})
