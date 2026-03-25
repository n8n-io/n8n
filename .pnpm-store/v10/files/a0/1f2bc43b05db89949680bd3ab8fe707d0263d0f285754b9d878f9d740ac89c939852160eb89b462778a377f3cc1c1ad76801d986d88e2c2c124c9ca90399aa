'use strict'

const why = require('why-is-node-running')
const t = require('tap')
const split = require('split2')
const path = require('path')
const childProcess = require('child_process')
const helper = require('./helper')

setInterval(function () {
  console.log(why())
}, 30000).unref()

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

t.plan(lines.length * 2 + 2)

const server = helper.startServer()
const port = server.address().port
const url = '/path' // no hostname

const child = childProcess.spawn(process.execPath, [path.join(__dirname, '..'), '-d', '1', url], {
  cwd: __dirname,
  env: Object.assign({}, process.env, {
    PORT: port
  }),
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: false
})

t.teardown(() => {
  try {
    child.kill()
  } catch {}
})

child
  .stderr
  .pipe(split())
  .on('data', (line) => {
    const regexp = lines.shift()
    t.ok(regexp, 'we are expecting this line')
    t.ok(regexp.test(line), 'line matches ' + regexp)
  })
  .on('end', () => {
    t.ok(server.autocannonConnects > 0, 'targeted the correct port')
  })

const noPortChild = childProcess.spawn(process.execPath, [path.join(__dirname, '..'), url], {
  cwd: __dirname,
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: false
})

noPortChild.on('exit', (code) => {
  t.equal(code, 1, 'should exit with error when a hostless URL is passed and no PORT var is available')
})
