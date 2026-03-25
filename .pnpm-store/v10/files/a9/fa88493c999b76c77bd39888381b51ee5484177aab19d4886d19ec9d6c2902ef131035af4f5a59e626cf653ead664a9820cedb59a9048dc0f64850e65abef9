'use strict'

const http = require('http')
const https = require('https')
const server = http.createServer(handler)
const port = +process.argv[2]
const prefix = process.argv[3]
const upstream = process.argv[4]
var calls = 0

server.listen(port)

function handler (req, res) {
  if (req.url.indexOf(prefix) !== 0) {
    throw new Error('request url [' + req.url + '] does not start with [' + prefix + ']')
  }

  var upstreamUrl = upstream + req.url.substring(prefix.length)
  https.get(upstreamUrl, function (ures) {
    ures.on('end', function () {
      if (++calls === 2) {
        server.close()
      }
    })
    ures.pipe(res)
  })
}
