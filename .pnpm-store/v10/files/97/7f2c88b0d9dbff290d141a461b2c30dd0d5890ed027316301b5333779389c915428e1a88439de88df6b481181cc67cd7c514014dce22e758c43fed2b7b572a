'use strict'

const path = require('path')
const { test } = require('tap')
const spawn = require('child_process').spawn
const split = require('split2')
const hasAsyncHooks = require('has-async-hooks')

test('--on-port flag', { skip: !hasAsyncHooks() }, (t) => {
  const lines = [
    /Running 1s test @ .*$/,
    /10 connections.*$/,
    /$/,
    /.*/,
    /$/,
    /Stat.*2\.5%.*50%.*97\.5%.*99%.*Avg.*Stdev.*Max.*$/,
    /.*/,
    /Latency.*$/,
    /$/,
    /.*/,
    /Stat.*1%.*2\.5%.*50%.*97\.5%.*Avg.*Stdev.*Min.*$/,
    /.*/,
    /Req\/Sec.*$/,
    /$/,
    /Bytes\/Sec.*$/,
    /.*/,
    /$/,
    /Req\/Bytes counts sampled once per second.*$/,
    /# of samples: 10*$/,
    /$/,
    /.* requests in ([0-9]|\.)+s, .* read/
  ]

  t.plan(lines.length * 2)

  const child = spawn(process.execPath, [
    path.join(__dirname, '..'),
    '-c', '10',
    '-d', '1',
    '--on-port', '/',
    '--', 'node', path.join(__dirname, './targetProcess')
  ], {
    cwd: __dirname,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  })

  t.teardown(() => {
    child.kill()
  })

  child
    .stderr
    .pipe(split())
    .on('data', (line) => {
      const regexp = lines.shift()
      t.ok(regexp, 'we are expecting this line')
      t.ok(regexp.test(line), 'line matches ' + regexp)
    })
})

test('assume --on-port flag if -- node is set', { skip: !hasAsyncHooks() }, (t) => {
  const lines = [
    /Running 1s test @ .*$/,
    /10 connections.*$/,
    /$/,
    /.*/,
    /$/,
    /Stat.*2\.5%.*50%.*97\.5%.*99%.*Avg.*Stdev.*Max.*$/,
    /.*/,
    /Latency.*$/,
    /$/,
    /.*/,
    /Stat.*1%.*2\.5%.*50%.*97\.5%.*Avg.*Stdev.*Min.*$/,
    /.*/,
    /Req\/Sec.*$/,
    /$/,
    /Bytes\/Sec.*$/,
    /.*/,
    /$/,
    /Req\/Bytes counts sampled once per second.*$/,
    /# of samples: 10*$/,
    /$/,
    /.* requests in ([0-9]|\.)+s, .* read/
  ]

  t.plan(lines.length * 2)

  const child = spawn(process.execPath, [
    path.join(__dirname, '..'),
    '-c', '10',
    '-d', '1',
    '/',
    '--', 'node', path.join(__dirname, './targetProcess')
  ], {
    cwd: __dirname,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  })

  t.teardown(() => {
    child.kill()
  })

  child
    .stderr
    .pipe(split())
    .on('data', (line) => {
      const regexp = lines.shift()
      t.ok(regexp, 'we are expecting this line')
      t.ok(regexp.test(line), 'line matches ' + regexp + `actual: ${line}  expected: ${regexp}`)
    })
})
