'use strict'

const test = require('tap').test
const split = require('split2')
const path = require('path')
const childProcess = require('child_process')
const { Writable } = require('stream')
const ansiRegex = require('ansi-regex')
const printResult = require('../lib/printResult')

test('should stdout (print) the result', (t) => {
  const lines = [
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
    /.*/,
    /Bytes\/Sec.*$/,
    /.*/,
    /$/,
    /Req\/Bytes counts sampled once per second.*$/,
    /# of samples: 10*$/,
    /$/,
    /.* requests in ([0-9]|\.)+s, .* read/
  ]

  t.plan(lines.length * 2)

  const child = childProcess.spawn(process.execPath, [path.join(__dirname, 'printResult-process.js')], {
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
    .on('end', t.end)
})

test('verify amount of total requests', (t) => {
  t.plan(1)

  // arrange
  const connections = 10
  const pipelining = 2
  const result = {
    connections,
    pipelining,
    latency: {},
    requests: {
      sent: connections * pipelining
    },
    throughput: {
      average: 3319,
      mean: 3319,
      stddev: 0,
      min: 3318,
      max: 3318,
      total: 3318,
      p0_001: 3319,
      p0_01: 3319,
      p0_1: 3319,
      p1: 3319,
      p2_5: 3319,
      p10: 3319,
      p25: 3319,
      p50: 3319,
      p75: 3319,
      p90: 3319,
      p97_5: 3319,
      p99: 3319,
      p99_9: 3319,
      p99_99: 3319,
      p99_999: 3319
    }
  }

  // act
  const output = printResult(result, { })

  // assert
  const expectedRequests = connections * pipelining
  t.match(output.includes(`${expectedRequests} requests in`), true)
})

test('should not print when verbose(V=0) is false', (t) => {
  t.plan(1)

  const connections = 10
  const pipelining = 2
  const result = {
    connections,
    pipelining,
    latency: {},
    requests: {
      sent: connections * pipelining
    },
    throughput: {
      average: 3319,
      mean: 3319,
      stddev: 0,
      min: 3318,
      max: 3318,
      total: 3318,
      p0_001: 3319,
      p0_01: 3319,
      p0_1: 3319,
      p1: 3319,
      p2_5: 3319,
      p10: 3319,
      p25: 3319,
      p50: 3319,
      p75: 3319,
      p90: 3319,
      p97_5: 3319,
      p99: 3319,
      p99_9: 3319,
      p99_99: 3319,
      p99_999: 3319
    }
  }

  // act
  const output = printResult(result, { verbose: false })
  t.ok(output.split('\n').length === 2)
})

test('should print with color when color is supported', (t) => {
  t.plan(1)

  const connections = 10
  const pipelining = 2
  const result = {
    connections,
    pipelining,
    latency: {},
    requests: {
      sent: connections * pipelining
    },
    throughput: {
      average: 3319,
      mean: 3319,
      stddev: 0,
      min: 3318,
      max: 3318,
      total: 3318,
      p0_001: 3319,
      p0_01: 3319,
      p0_1: 3319,
      p1: 3319,
      p2_5: 3319,
      p10: 3319,
      p25: 3319,
      p50: 3319,
      p75: 3319,
      p90: 3319,
      p97_5: 3319,
      p99: 3319,
      p99_9: 3319,
      p99_99: 3319,
      p99_999: 3319
    }
  }

  const { FORCE_COLOR, NO_COLOR, COLOR, CI, COLORTERM } = process.env
  delete process.env.FORCE_COLOR
  delete process.env.NO_COLOR
  delete process.env.COLOR
  delete process.env.CI
  process.env.COLORTERM = 'truecolor'
  const outputStream = new Writable({
    write () {}
  })
  outputStream.isTTY = true

  // act
  const output = printResult(result, { outputStream })
  t.ok(ansiRegex().test(output))

  // cleanup
  process.env.FORCE_COLOR = FORCE_COLOR
  process.env.NO_COLOR = NO_COLOR
  process.env.COLOR = COLOR
  process.env.CI = CI
  process.env.COLORTERM = COLORTERM
})

test('should not print with any color when color is not supported', (t) => {
  t.plan(1)

  const connections = 10
  const pipelining = 2
  const result = {
    connections,
    pipelining,
    latency: {},
    requests: {
      sent: connections * pipelining
    },
    throughput: {
      average: 3319,
      mean: 3319,
      stddev: 0,
      min: 3318,
      max: 3318,
      total: 3318,
      p0_001: 3319,
      p0_01: 3319,
      p0_1: 3319,
      p1: 3319,
      p2_5: 3319,
      p10: 3319,
      p25: 3319,
      p50: 3319,
      p75: 3319,
      p90: 3319,
      p97_5: 3319,
      p99: 3319,
      p99_9: 3319,
      p99_99: 3319,
      p99_999: 3319
    }
  }

  const { FORCE_COLOR, NO_COLOR, COLOR, CI, COLORTERM } = process.env
  delete process.env.FORCE_COLOR
  delete process.env.NO_COLOR
  delete process.env.COLOR
  delete process.env.CI
  process.env.COLORTERM = 'truecolor'
  const outputStream = new Writable({
    write () {}
  })

  // act
  const output = printResult(result, { outputStream })
  t.ok(!ansiRegex().test(output))

  // cleanup
  process.env.FORCE_COLOR = FORCE_COLOR
  process.env.NO_COLOR = NO_COLOR
  process.env.COLOR = COLOR
  process.env.CI = CI
  process.env.COLORTERM = COLORTERM
})
