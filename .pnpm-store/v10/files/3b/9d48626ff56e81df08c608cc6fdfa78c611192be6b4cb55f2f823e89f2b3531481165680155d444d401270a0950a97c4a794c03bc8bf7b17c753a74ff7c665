'use strict'

const { test } = require('tap')
const { test: { install } } = require('../lib/install')
const log = require('npmlog')

log.level = 'error' // we expect a warning

test('EACCES retry once', async (t) => {
  t.plan(3)

  const fs = {
    promises: {
      stat (_) {
        const err = new Error()
        err.code = 'EACCES'
        t.ok(true)
        throw err
      }
    }
  }

  const Gyp = {
    devDir: __dirname,
    opts: {
      ensure: true
    },
    commands: {
      install (argv, cb) {
        install(fs, Gyp, argv).then(cb, cb)
      },
      remove (_, cb) {
        cb()
      }
    }
  }

  try {
    await install(fs, Gyp, [])
  } catch (err) {
    t.ok(true)
    if (/"pre" versions of node cannot be installed/.test(err.message)) {
      t.ok(true)
    }
  }
})
