'use strict'

const test = require('tap').test
const initJob = require('../lib/init')
const helper = require('./helper')
const server = helper.startServer()

test('running with forever set to true and passing in a callback should cause an error to be returned in the callback', (t) => {
  t.plan(2)

  initJob({
    url: `http://localhost:${server.address().port}`,
    forever: true
  }, (err, res) => {
    t.ok(err, 'should be error when callback passed to run')
    t.notOk(res, 'should not exist')
    t.end()
  })
})

test('run forever should run until .stop() is called', (t) => {
  t.plan(3)
  let numRuns = 0

  const instance = initJob({
    url: `http://localhost:${server.address().port}`,
    duration: 0.5,
    forever: true
  })

  instance.on('done', (results) => {
    t.ok(results, 'should have gotten results')
    if (++numRuns === 2) {
      instance.stop()
      setTimeout(() => {
        t.ok(true, 'should have reached here without the callback being called again')
        t.end()
      }, 1000)
    }
  })
})
