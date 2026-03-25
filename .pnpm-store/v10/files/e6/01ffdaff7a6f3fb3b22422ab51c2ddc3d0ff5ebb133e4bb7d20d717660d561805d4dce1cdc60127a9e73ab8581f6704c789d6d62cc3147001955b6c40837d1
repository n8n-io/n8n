'use strict'

const test = require('tap').test
const split = require('split2')
const path = require('path')
const childProcess = require('child_process')

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
    /.*/,
    /Code.*Count.*$/,
    /.*/,
    /200.*500.*$/,
    /.*/,
    /302.*0.*$/,
    /.*/,
    /401.*0.*$/,
    /.*/,
    /403.*0.*$/,
    /.*/,
    /$/,
    /Req\/Bytes counts sampled once per second.*$/,
    /# of samples: 10.*$/,
    /$/,
    /.* requests in ([0-9]|\.)+s, .* read/
  ]

  t.plan(lines.length * 2)

  const child = childProcess.spawn(process.execPath, [path.join(__dirname, 'printResult-process.js'), '--renderStatusCodes', 'http://127.0.0.1'], {
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
