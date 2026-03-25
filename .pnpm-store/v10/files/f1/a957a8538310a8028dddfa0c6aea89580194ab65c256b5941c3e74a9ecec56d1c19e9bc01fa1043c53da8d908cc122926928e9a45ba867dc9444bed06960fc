'use strict'

const http = require('http')
const autocannon = require('../autocannon')

function createHandler (serverName) {
  return function (req, res) {
    console.log(serverName + ' received request')
    res.end('hello world')
  }
}

const server1 = http.createServer(createHandler('server1'))
const server2 = http.createServer(createHandler('server2'))

server1.listen(0, startBench)
server2.listen(0, startBench)

function startBench () {
  const url = [
    'http://localhost:' + server1.address().port,
    'http://localhost:' + server2.address().port
  ]

  // same with run the follow command in cli
  // autocannon -d 10 -c 2 http://localhost:xxxx http://localhost:yyyy
  autocannon({
    url,
    // connection number should n times of the number of server
    connections: 2,
    duration: 10,
    requests: [
      {
        method: 'GET',
        path: '/'
      }
    ]
  }, finishedBench)

  function finishedBench (err, res) {
    console.log('finished bench', err, res)
    process.exit(1)
  }
}
