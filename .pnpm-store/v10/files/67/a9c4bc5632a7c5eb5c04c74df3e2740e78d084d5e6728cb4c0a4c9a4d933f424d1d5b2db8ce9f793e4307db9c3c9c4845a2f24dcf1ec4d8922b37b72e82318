'use strict'

const helper = require('./helper')
const test = require('tap').test
const { defaultMaxListeners } = require('events')
const { Writable } = require('stream')
const sinon = require('sinon')
const autocannon = require('../autocannon')
const { hasWorkerSupport } = require('../lib/util')

test(`should not emit warnings when using >= ${defaultMaxListeners} workers`, { skip: !hasWorkerSupport }, t => {
  const server = helper.startServer()

  const instance = autocannon({
    url: `http://localhost:${server.address().port}`,
    workers: defaultMaxListeners,
    duration: 1
  })

  setTimeout(() => {
    instance.stop()
    t.notOk(emitWarningSpy.called)
    emitWarningSpy.restore()
    t.end()
  }, 2000)

  const emitWarningSpy = sinon.spy(process, 'emitWarning')

  autocannon.track(instance, {
    outputStream: new Writable({
      write () {}
    })
  })
})
