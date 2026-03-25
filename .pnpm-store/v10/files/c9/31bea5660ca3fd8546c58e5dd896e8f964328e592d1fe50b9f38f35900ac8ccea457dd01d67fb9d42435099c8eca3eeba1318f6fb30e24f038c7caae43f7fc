'use strict'
const test = require('tap').test
const initJob = require('../../lib/init')

test('should log error on connection error', t => {
  t.plan(1)
  console.error = function (obj) {
    t.type(obj, Error)
    console.error = () => {}
  }
  initJob({
    url: 'http://unknownhost',
    connections: 2,
    duration: 5,
    title: 'title321',
    debug: true
  })
})
