'use strict'

const http = require('http')
const autocannon = require('../autocannon')

const server = http.createServer(handle)

server.listen(0, startBench)

function handle (req, res) {
  res.end('hello world')
}

function startBench () {
  const url = 'http://localhost:' + server.address().port

  const instance = autocannon({
    url,
    connections: 1000,
    duration: 10
  }, finishedBench)

  let message = 0
  // modify the body on future requests
  instance.on('response', function (client, statusCode, returnBytes, responseTime) {
    client.setBody('message ' + message++)
  })

  let headers = 0
  // modify the headers on future requests
  // this wipes any existing headers out with the new ones
  instance.on('response', function (client, statusCode, returnBytes, responseTime) {
    const newHeaders = {}
    newHeaders[`header${headers++}`] = `headerValue${headers++}`
    client.setHeaders(newHeaders)
  })

  function finishedBench (err, res) {
    console.log('finished bench', err, res)
  }
}
