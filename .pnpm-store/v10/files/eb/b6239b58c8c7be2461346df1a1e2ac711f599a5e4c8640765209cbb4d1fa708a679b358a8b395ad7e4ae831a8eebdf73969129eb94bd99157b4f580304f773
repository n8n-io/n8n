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

  autocannon({
    url,
    connections: 1000,
    duration: 10,
    requests: [
      {
        method: 'POST',
        path: '/register',
        headers: {
          'Content-type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          name: 'New User',
          email: 'new-[<id>]@user.com' // [<id>] will be replaced with generated HyperID at run time
        })
      }
    ],
    idReplacement: true
  }, finishedBench)

  function finishedBench (err, res) {
    console.log('finished bench', err, res)
  }
}
