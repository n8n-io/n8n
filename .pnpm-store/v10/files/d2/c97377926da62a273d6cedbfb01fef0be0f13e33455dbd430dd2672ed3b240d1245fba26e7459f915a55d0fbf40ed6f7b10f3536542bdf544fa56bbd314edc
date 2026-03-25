'use strict'

const http = require('http')
const path = require('path')
const autocannon = require('../autocannon')

const server = http.createServer(handle)

server.listen(0, startBench)

function handle (req, res) {
  res.end('hello world')
}

function startBench () {
  const url = 'http://localhost:' + server.address().port

  autocannon({
    url,
    connections: 1000,
    duration: 10,
    workers: 2,
    verifyBody: path.join(__dirname, 'helpers', 'verify-body')
  }, finishedBench)

  function finishedBench (err, res) {
    console.log('finished bench', err, res)
  }
}
