'use strict'

const http = require('http')
const autocannon = require('../autocannon')

const server = http.createServer(handle)

server.listen(0, startBench)

let connection = 0

function handle (req, res) {
  res.end('hello world')
}

function startBench () {
  const url = 'http://localhost:' + server.address().port

  autocannon({
    url,
    connections: 1000,
    duration: 10,
    setupClient
  }, finishedBench)

  function setupClient (client) {
    client.setBody('connection number', connection++)
  }

  function finishedBench (err, res) {
    console.log('finished bench', err, res)
  }
}
