'use strict'

const http = require('http')
const path = require('path')
const autocannon = require('../autocannon')

const server = http.createServer(handle)

server.listen(0, startBench)

function handle (req, res) {
  const body = []
  // this route handler simply returns whatever it gets from response
  req
    .on('data', chunk => body.push(chunk))
    .on('end', () => res.end(Buffer.concat(body)))
}

function startBench () {
  const url = 'http://localhost:' + server.address().port

  autocannon({
    url,
    duration: 2,
    workers: 2,
    requests: [
      {
        // let's create a new user
        method: 'POST',
        path: '/users',
        body: JSON.stringify({ firstName: 'Jane', id: 10 }),
        onResponse: path.join(__dirname, 'helpers', 'on-response')
      },
      {
        // now we'll give them a last name
        method: 'PUT',
        setupRequest: path.join(__dirname, 'helpers', 'setup-request')
      }
    ]
  }, finishedBench)

  function finishedBench (err, res) {
    console.log('finished bench', err, res)
  }
}
