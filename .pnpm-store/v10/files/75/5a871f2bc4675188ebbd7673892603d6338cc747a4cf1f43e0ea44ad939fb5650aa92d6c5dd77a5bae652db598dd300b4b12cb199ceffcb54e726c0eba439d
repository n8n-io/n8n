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
    headers: {
      // by default we add an auth token to all requests
      auth: 'A Pregenerated auth token'
    },
    requests: [
      {
        method: 'POST', // this should be a post for logging in
        path: '/login',
        body: 'valid login details',
        // overwrite our default headers,
        // so we don't add an auth token
        // for this request
        headers: {}
      },
      {
        path: '/mySecretDetails'
        // this will automatically add the pregenerated auth token
      },
      {
        method: 'GET', // this should be a put for modifying secret details
        path: '/mySecretDetails',
        headers: { // let submit some json?
          'Content-type': 'application/json; charset=utf-8'
        },
        // we need to stringify the json first
        body: JSON.stringify({
          name: 'my new name'
        }),
        setupRequest: reqData => {
          reqData.method = 'PUT' // we are overriding the method 'GET' to 'PUT' here
          return reqData
        }
      }
    ]
  }, finishedBench)

  function finishedBench (err, res) {
    console.log('finished bench', err, res)
  }
}
