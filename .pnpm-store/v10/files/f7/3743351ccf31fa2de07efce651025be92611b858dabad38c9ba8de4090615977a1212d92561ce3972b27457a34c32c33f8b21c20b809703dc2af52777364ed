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
    connections: 1,
    amount: 1,
    initialContext: { user: { firstName: 'Salman' } },
    requests: [
      {
        // use data from context
        method: 'PUT',
        setupRequest: (req, context) => ({
          ...req,
          path: `/user/${context.user.id}`,
          body: JSON.stringify({
            ...context.user,
            lastName: 'Mitha'
          })
        })
      }
    ]
  }, finishedBench)

  function finishedBench (err, res) {
    console.log('finished bench', err, res)
  }
}
