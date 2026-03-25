'use strict'

const helper = require('./helper')
const test = require('tap').test
const progressTracker = require('../lib/progressTracker')
const autocannon = require('../autocannon')

test('progress tracker should throw if no instance is provided', t => {
  t.plan(1)
  try {
    progressTracker(null, {})
  } catch (error) {
    t.same(error.message, 'instance required for tracking')
  }
})

test('should work', t => {
  const server = helper.startServer({ statusCode: 404 })
  const instance = autocannon({
    url: `http://localhost:${server.address().port}`,
    pipelining: 2
  }, console.log)

  setTimeout(() => {
    instance.stop()
    t.end()
  }, 2000)

  autocannon.track(instance, {
    renderProgressBar: true,
    renderLatencyTable: true
  })
})

test('should work with amount', t => {
  const server = helper.startServer()
  const instance = autocannon({
    url: `http://localhost:${server.address().port}`,
    pipelining: 1,
    amount: 10
  }, process.stdout)

  setTimeout(() => {
    instance.stop()
    t.end()
  }, 2000)
  autocannon.track(instance, {
    renderProgressBar: true
  })
  t.pass()
})

test('should log mismatches', t => {
  const server = helper.startServer()
  const instance = autocannon({
    url: `http://localhost:${server.address().port}`,
    pipelining: 1,
    amount: 10,
    expectBody: 'modified'
  }, console.log)

  setTimeout(() => {
    instance.stop()
    t.end()
  }, 2000)
  autocannon.track(instance, {
    renderProgressBar: true
  })
  t.pass()
})

test('should log resets', t => {
  const server = helper.startServer()
  const instance = autocannon({
    url: `http://localhost:${server.address().port}`,
    connections: 1,
    amount: 10,
    requests: [
      { method: 'GET' },
      {
        method: 'GET',
        // falsey result will reset
        setupRequest: () => {}
      },
      { method: 'GET' }
    ]
  }, console.log)

  setTimeout(() => {
    instance.stop()
    t.end()
  }, 2000)
  autocannon.track(instance, {
    renderProgressBar: true
  })
  t.pass()
})
