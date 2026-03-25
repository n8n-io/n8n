'use strict'

const childProcess = require('child_process')
const fs = require('fs')
const path = require('path')
const test = require('tap').test

const { promisify } = require('util')

const exec = promisify(childProcess.exec).bind(childProcess)
const proxyquire = require('proxyquire')

const baseDir = path.join(__dirname, '..', '..')

test('should print error if url.URL is not a function', t => {
  t.plan(2)

  const _error = console.error
  const _exit = process.exit

  process.exit = (code) => {
    t.equal(code, 1)
    process.exit = _exit
    t.end()
  }
  console.error = (obj) => {
    t.equal(
      obj,
      'autocannon requires the WHATWG URL API, but it is not available. Please upgrade to Node 6.13+.'
    )
    console.error = _error
  }
  proxyquire('../..', {
    url: {
      URL: null
    }
  })
})

test('should print version if invoked with --version', async t => {
  t.plan(1)
  const res = await exec(`node ${baseDir}/autocannon.js --version`)
  t.ok(res.stdout.match(/autocannon v(\d+\.\d+\.\d+)/))
})

test('should print help if invoked with --help', async t => {
  t.plan(1)
  const help = fs.readFileSync(path.join(baseDir, 'help.txt'), 'utf8')
  const res = await exec(`node ${baseDir}/autocannon.js --help`)
  t.same(res.stderr.trim(), help.trim()) // console.error adds \n at the end of print
})

test('should print help if no url is provided', async t => {
  t.plan(1)
  const help = fs.readFileSync(path.join(baseDir, 'help.txt'), 'utf8')
  const res = await exec(`node ${baseDir}/autocannon.js`)
  t.same(res.stderr.trim(), help.trim()) // console.error adds \n at the end of print
})

test('start should console an error when a promise is caught', (t) => {
  const Autocannon = t.mock('../../autocannon', {
    '../../lib/init': () => new Promise((resolve, reject) => {
      reject(new Error('Test Error'))
    })
  })

  t.plan(1)

  const _error = console.error
  console.error = (obj) => {
    t.equal(
      obj,
      'Test Error'
    )
    console.error = _error
  }

  Autocannon.start(
    Autocannon.parseArguments([
      '-d', '1',
      '-c', '1',
      'http://localhost/foo/bar'
    ])
  )
})

test('start should console an error when one is thrown without a promise', (t) => {
  const Autocannon = t.mock('../../autocannon', {
    '../../lib/init': () => { throw new Error('Test Error') }
  })

  t.plan(1)

  const _error = console.error
  console.error = (obj) => {
    t.equal(
      obj,
      'Test Error'
    )
    console.error = _error
  }

  Autocannon.start(
    Autocannon.parseArguments([
      '-d', '1',
      '-c', '1',
      '--forever',
      'http://localhost/foo/bar'
    ])
  )
})

test('start should console an error when --on-port is used without async hooks', (t) => {
  const Autocannon = t.mock('../../autocannon', {
    'has-async-hooks': () => false,
    child_process: {
      spawn: () => {}
    },
    '../../lib/init': () => {},
    net: {
      createServer: () => ({
        listen: () => {},
        on: () => {}
      })
    }
  })

  t.plan(2)

  const _exit = process.exit
  process.exit = (code) => {
    t.equal(code, 1)
    process.exit = _exit
    t.end()
  }
  const _error = console.error
  console.error = (obj) => {
    t.equal(
      obj,
      'The --on-port flag requires the async_hooks builtin module, but it is not available. Please upgrade to Node 8.1+.'
    )
    console.error = _error
  }

  Autocannon.start(
    Autocannon.parseArguments([
      '-d', '1',
      '-c', '1',
      '--on-port',
      'http://localhost/foo/bar'
    ])
  )
})

test('When there is a port, createChannel should try to unlink the socketPath', (t) => {
  const Autocannon = t.mock('../../autocannon', {
    'has-async-hooks': () => true,
    child_process: {
      spawn: () => {}
    },
    '../../lib/init': () => {},
    net: {
      createServer: () => ({
        listen: () => {},
        on: (eventName, cb) => {
          t.equal(eventName, 'close')
          cb()
        }
      })
    }
  })

  t.plan(1)

  Autocannon.start(
    Autocannon.parseArguments([
      '-d', '1',
      '-c', '1',
      '--on-port',
      'http://localhost/foo/bar'
    ])
  )
})

test('createChannel should try to unlink the socketPath', (t) => {
  const Autocannon = t.mock('../../autocannon', {
    'has-async-hooks': () => true,
    child_process: {
      spawn: () => {}
    },
    '../../lib/init': () => {},
    net: {
      createServer: () => ({
        listen: () => {},
        on: (_, cb) => {
          t.equal(_, 'close')
          cb()
        }
      })
    }
  })

  t.plan(1)

  Autocannon.start(
    Autocannon.parseArguments([
      '-d', '1',
      '-c', '1',
      '--on-port',
      'http://localhost/foo/bar'
    ])
  )
})
