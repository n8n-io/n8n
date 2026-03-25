'use strict'

const t = require('tap')
const split = require('split2')
const os = require('os')
const path = require('path')
const childProcess = require('child_process')
const helper = require('./helper')

const win = process.platform === 'win32'

const lines = [
  /Running 1s test @ http:\/\/example.com\/foo \([^)]*\)$/,
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
  /.*/,
  /Bytes\/Sec.*$/,
  /.*/,
  /$/,
  /Req\/Bytes counts sampled once per second.*$/,
  /# of samples: 10*$/,
  /$/,
  /.* requests in ([0-9]|\.)+s, .* read/
]

if (!win) {
  // If not Windows we can predict exactly how many lines there will be. On
  // Windows we rely on t.end() being called.
  t.plan(lines.length)
}

t.autoend(false)
t.teardown(function () {
  child.kill()
})

const socketPath = win
  ? path.join('\\\\?\\pipe', process.cwd(), 'autocannon-' + Date.now())
  : path.join(os.tmpdir(), 'autocannon-' + Date.now() + '.sock')

helper.startServer({ socketPath })

const child = childProcess.spawn(process.execPath, [path.join(__dirname, '..'), '-d', '1', '-S', socketPath, 'example.com/foo'], {
  cwd: __dirname,
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: false
})

// For handling the last line on Windows
let errorLine = false
let failsafeTimer

child
  .stderr
  .pipe(split())
  .on('data', (line) => {
    let regexp = lines.shift()
    const lastLine = lines.length === 0

    if (regexp) {
      t.ok(regexp.test(line), 'line matches ' + regexp)

      if (lastLine && win) {
        // We can't be sure the error line is outputted on Windows, so in case
        // this really is the last line, we'll set a timer to auto-end the test
        // in case there are no more lines.
        failsafeTimer = setTimeout(function () {
          t.end()
        }, 1000)
      }
    } else if (!errorLine && win) {
      // On Windows a few errors are expected. We'll accept a 1% error rate on
      // the pipe.
      errorLine = true
      clearTimeout(failsafeTimer)
      regexp = /^(\d+) errors \(0 timeouts\)$/
      const match = line.match(regexp)
      t.ok(match, 'line matches ' + regexp)
      const errors = Number(match[1])
      t.ok(errors / 15000 < 0.01, `should have less than 1% errors on Windows (had ${errors} errors)`)
      t.end()
    } else {
      throw new Error('Unexpected line: ' + JSON.stringify(line))
    }
  })
