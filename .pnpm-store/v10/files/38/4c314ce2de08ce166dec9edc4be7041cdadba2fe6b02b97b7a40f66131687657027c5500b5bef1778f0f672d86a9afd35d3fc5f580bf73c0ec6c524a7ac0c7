'use strict'

const http = require('http')
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
    requests: [
      {
        // let's create a new user
        method: 'POST',
        path: '/users',
        body: JSON.stringify({ firstName: 'Jane', id: 10 }),
        onResponse: (status, body, context) => {
          if (status === 200) {
            context.user = JSON.parse(body)
          } // on error, you may abort the benchmark
        }
      },
      {
        // now we'll give them a last name
        method: 'PUT',
        setupRequest: (req, context) => ({
          ...req,
          path: `/user/${context.user.id}`,
          body: JSON.stringify({
            ...context.user,
            lastName: 'Doe'
          })
        })
      }
    ]
  }, finishedBench)

  function finishedBench (err, res) {
    console.log('finished bench', err, res)
  }
}
