'use strict'

const cluster = require('cluster')
const http = require('http')
const numCPUs = Math.floor(require('os').cpus().length / 2) || 1

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`)

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`)
  })
} else {
  // Workers can share any TCP connection
  // In this case it is an HTTP server
  http.createServer((req, res) => {
    res.writeHead(200)
    res.end('hello world\n')
  }).listen(3000)

  console.log(`Worker ${process.pid} started`)
}
