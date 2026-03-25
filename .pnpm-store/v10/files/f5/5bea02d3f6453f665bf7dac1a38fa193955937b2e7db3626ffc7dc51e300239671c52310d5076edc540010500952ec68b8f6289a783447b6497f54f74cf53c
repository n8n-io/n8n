'use strict'

const test = require('tap').test
const initJob = require('../lib/init')
const helper = require('./helper')
const server = helper.startServer()

test('run should only send the expected number of requests per second - scenario 1', (t) => {
  t.plan(3)

  initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 2,
    overallRate: 10,
    amount: 40,
    sampleInt: 1000
  }, (err, res) => {
    t.error(err)

    t.equal(Math.floor(res.duration), 4, 'should have take 4 seconds to send 10 requests per seconds')
    t.equal(res.requests.average, 10, 'should have sent 10 requests per second on average')
  })
})

test('run should only send the expected number of requests per second - scenario 2', (t) => {
  t.plan(3)

  initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 2,
    connectionRate: 10,
    amount: 40,
    sampleInt: 1000
  }, (err, res) => {
    t.error(err)
    t.equal(Math.floor(res.duration), 2, 'should have taken 2 seconds to send 10 requests per connection with 2 connections')
    t.equal(res.requests.average, 20, 'should have sent 20 requests per second on average with two connections')
  })
})

test('run should only send the expected number of requests per second - scenario 3', (t) => {
  t.plan(3)

  initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 15,
    overallRate: 10,
    amount: 40,
    sampleInt: 1000
  }, (err, res) => {
    t.error(err)
    t.equal(Math.floor(res.duration), 4, 'should have take 4 seconds to send 10 requests per seconds')
    t.equal(res.requests.average, 10, 'should have sent 10 requests per second on average')
  })
})

test('run should compensate for coordinated omission when the expected number of requests per second is too high', (t) => {
  t.plan(2)

  initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 100,
    connectionRate: 1000,
    duration: 1
  }, (err, res) => {
    t.error(err)
    t.not(res.latency.totalCount, res.requests.total, 'should have recorded additionnal latencies')
  })
})

test('run should not compensate for coordinated omission when this feature is disabled', (t) => {
  t.plan(2)

  initJob({
    url: `http://localhost:${server.address().port}`,
    connections: 100,
    connectionRate: 1000,
    ignoreCoordinatedOmission: true,
    duration: 1
  }, (err, res) => {
    t.error(err)
    t.equal(res.latency.totalCount, res.requests.total, 'should not have recorded additionnal latencies')
  })
})
