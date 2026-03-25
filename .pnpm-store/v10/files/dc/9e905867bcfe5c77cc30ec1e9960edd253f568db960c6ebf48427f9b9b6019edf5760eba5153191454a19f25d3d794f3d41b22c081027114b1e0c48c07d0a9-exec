#!/usr/bin/env node

const ModuleServer = require("./moduleserver")
const path = require("path")

let host = "localhost", port = 8080, dir = ".", prefix = null, maxDepth = 1

function usage() {
  console.log("Usage: esmoduleserve [--port port] [--host host] [--depth n] [--prefix prefix] [dir]")
  process.exit(1)
}

for (var i = 2; i < process.argv.length; i++) {
  let arg = process.argv[i], next = process.argv[i + 1]
  if (arg == "--port" && next) { port = +next; i++ }
  else if (arg == "--host" && next) { host = next; i++ }
  else if (arg == "--prefix" && next) { prefix = next; i++ }
  else if (arg == "--depth" && /^\d+$/.test(next)) { maxDepth = +next; i++ }
  else if (dir == "." && arg[0] != "-") dir = arg
  else usage()
}

// The root directory being served.
const root = path.resolve(dir)

const static = require("serve-static")(root)
const moduleServer = new ModuleServer({root, maxDepth, prefix}).handleRequest

// Create the server that listens to HTTP requests
// and returns module contents.
require("http").createServer((req, resp) => {
  if (moduleServer(req, resp)) return
  static(req, resp, function next(err) {
    resp.statusCode = 404
    resp.end('Not found')
  })
}).listen(port, host)

console.log("Module server listening on http://" + host + ":" + port)
