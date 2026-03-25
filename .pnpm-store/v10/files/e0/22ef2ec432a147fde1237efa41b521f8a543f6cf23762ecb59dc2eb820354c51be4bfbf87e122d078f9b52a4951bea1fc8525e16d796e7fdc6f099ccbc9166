'use strict'

const os = require('os')
const http = require('http')
const path = require('path')
const test = require('tap').test
const Client = require('../lib/httpClient')
const helper = require('./helper')
const server = helper.startServer()
const timeoutServer = helper.startTimeoutServer()
const httpsServer = helper.startHttpsServer()
const tlsServer = helper.startTlsServer()
const trailerServer = helper.startTrailerServer()
const bl = require('bl')
const fs = require('fs')

const makeResponseFromBody = ({ server, method, body, headers = {} }) => {
  const sentHeaders = {
    Connection: 'keep-alive',
    ...headers
  }
  if (!sentHeaders['Content-Length'] && body) {
    sentHeaders['Content-Length'] = body.length
  }
  return `${method} / HTTP/1.1\r\nHost: localhost:${
    server.address().port
  }\r\n${
    Object.keys(sentHeaders).map(name => `${name}: ${sentHeaders[name]}`).join('\r\n')
  }\r\n${
    body ? `\r\n${body}` : '\r\n'
  }`
}

test('client calls a server twice', (t) => {
  t.plan(4)

  const client = new Client(server.address())
  let count = 0

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    if (count++ > 0) {
      client.destroy()
    }
  })
})

test('client calls a https server twice', (t) => {
  t.plan(4)

  const opts = httpsServer.address()
  opts.protocol = 'https:'
  const client = new Client(opts)
  let count = 0

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    if (count++ > 0) {
      client.destroy()
    }
  })
})

test('client calculates correct duration when using pipelining', (t) => {
  t.plan(6)

  const delayResponse = 500
  const lazyServer = helper.startServer({ delayResponse })
  const opts = lazyServer.address()
  opts.pipelining = 2
  const startTime = process.hrtime()
  const client = new Client(opts)
  let count = 0

  client.on('response', (statusCode, length, duration) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(duration > delayResponse, `Expected response delay > ${delayResponse}ms but got ${duration}ms`)

    const hrduration = process.hrtime(startTime)
    const maxExpectedDuration = hrduration[0] * 1e3 + hrduration[1] / 1e6
    t.ok(duration < maxExpectedDuration, `Expected response delay < ${maxExpectedDuration}ms but got ${duration}ms`)

    if (++count === 2) {
      client.destroy()
    }
  })
})

test('client calls a tls server without SNI servername twice', (t) => {
  t.plan(4)

  const opts = tlsServer.address()
  opts.protocol = 'https:'
  const client = new Client(opts)
  let count = 0

  client.on('headers', (response) => {
    t.equal(response.statusCode, 200, 'status code matches')
    t.same(response.headers, ['X-servername', '', 'Content-Length', '0'])
    if (count++ > 0) {
      client.destroy()
    }
  })
})

test('client calls a tls server with SNI servername twice', (t) => {
  t.plan(4)

  const opts = tlsServer.address()
  opts.protocol = 'https:'
  opts.servername = 'example.com'
  const client = new Client(opts)
  let count = 0

  client.on('headers', (response) => {
    t.equal(response.statusCode, 200, 'status code matches')
    t.same(response.headers, ['X-servername', opts.servername, 'Content-Length', '0'])
    if (count++ > 0) {
      client.destroy()
    }
  })
})

test('client uses SNI servername from URL hostname by default', (t) => {
  t.plan(4)

  const opts = tlsServer.address()
  opts.protocol = 'https:'
  opts.hostname = 'localhost'
  const client = new Client(opts)
  let count = 0

  client.on('headers', (response) => {
    t.equal(response.statusCode, 200, 'status code matches')
    t.same(response.headers, ['X-servername', opts.hostname, 'Content-Length', '0'])
    if (count++ > 0) {
      client.destroy()
    }
  })
})

test('client prefers SNI servername from opts over URL hostname', (t) => {
  t.plan(4)

  const opts = tlsServer.address()
  opts.protocol = 'https:'
  opts.hostname = 'localhost'
  opts.servername = 'example.com'
  const client = new Client(opts)
  let count = 0

  client.on('headers', (response) => {
    t.equal(response.statusCode, 200, 'status code matches')
    t.same(response.headers, ['X-servername', opts.servername, 'Content-Length', '0'])
    if (count++ > 0) {
      client.destroy()
    }
  })
})

test('client ignores IP address in hostname-derived SNI servername', (t) => {
  t.plan(4)

  const opts = tlsServer.address()
  opts.protocol = 'https:'
  opts.hostname = opts.address
  const client = new Client(opts)
  let count = 0

  client.on('headers', (response) => {
    t.equal(response.statusCode, 200, 'status code matches')
    t.same(response.headers, ['X-servername', '', 'Content-Length', '0'])
    if (count++ > 0) {
      client.destroy()
    }
  })
})

test('client ignores falsy SNI servername', (t) => {
  t.plan(4)

  const opts = tlsServer.address()
  opts.protocol = 'https:'
  opts.servername = ''
  const client = new Client(opts)
  let count = 0

  client.on('headers', (response) => {
    t.equal(response.statusCode, 200, 'status code matches')
    t.same(response.headers, ['X-servername', '', 'Content-Length', '0'])
    if (count++ > 0) {
      client.destroy()
    }
  })
})

test('client passes through tlsOptions to connect', (t) => {
  t.plan(4)

  const opts = tlsServer.address()
  opts.protocol = 'https:'
  opts.tlsOptions = {
    key: fs.readFileSync(path.join(__dirname, '/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '/cert.pem')),
    passphrase: 'test'
  }
  const client = new Client(opts)
  let count = 0

  client.on('headers', (response) => {
    t.equal(response.statusCode, 200, 'status code matches')
    t.same(response.headers, ['X-servername', '', 'X-email', 'tes@test.com', 'Content-Length', '0'])
    if (count++ > 0) {
      client.destroy()
    }
  })
})

test('http client automatically reconnects', (t) => {
  t.plan(4)

  const client = new Client(server.address())
  let count = 0

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    if (count++ > 0) {
      client.destroy()
    }
  })

  server.once('request', function (req, res) {
    setImmediate(() => {
      req.socket.destroy()
    })
  })
})

test('http clients should have a different body', (t) => {
  t.plan(3)

  let clientCnt = 0
  const clients = []
  const reqArray = ['John', 'Gabriel', 'Jason']
  const opts = server.address()

  opts.setupClient = (client) => {
    client.setBody(JSON.stringify({ name: reqArray[clientCnt] }))
    clientCnt++
  }

  for (let i = 0; i < 3; i++) {
    const client = new Client(opts)

    clients.push(client)
  }

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i]
    const body = JSON.parse(client.requestIterator.currentRequest.body)

    t.equal(body.name, reqArray[i], 'body match')
    client.destroy()
  }
})

test('client supports custom headers', (t) => {
  t.plan(3)

  const opts = server.address()
  opts.headers = {
    hello: 'world'
  }
  const client = new Client(opts)

  server.once('request', (req, res) => {
    t.equal(req.headers.hello, 'world', 'custom header matches')
  })

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    client.destroy()
  })
})

test('client supports custom headers in requests', (t) => {
  t.plan(2)

  const opts = server.address()
  opts.requests = [
    {
      path: '/',
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        foo: 'example'
      })
    }
  ]
  const client = new Client(opts)

  server.once('request', (req, res) => {
    t.equal(req.headers['content-type'], 'application/json', 'custom header matches')
  })

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    client.destroy()
  })
})

test('client supports host custom header', (t) => {
  t.plan(2)

  const opts = server.address()
  opts.headers = {
    host: 'www.autocannon.com'
  }
  const client = new Client(opts)

  server.once('request', (req, res) => {
    t.equal(req.headers.host, 'www.autocannon.com', 'host header matches')
  })

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    client.destroy()
  })
})

test('client supports host custom header with mixed case', (t) => {
  t.plan(2)

  const opts = server.address()
  opts.headers = {
    Host: 'www.autocannon.com'
  }
  const client = new Client(opts)

  server.once('request', (req, res) => {
    t.equal(req.headers.host, 'www.autocannon.com', 'host header matches')
  })

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    client.destroy()
  })
})

test('client supports response trailers', (t) => {
  t.plan(3)

  const client = new Client(trailerServer.address())
  let n = 0
  client.on('body', (raw) => {
    if (++n === 1) {
      // trailer value
      t.ok(/7895bf4b8828b55ceaf47747b4bca667/.test(raw.toString()))
    }
  })
  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    client.destroy()
  })
})

;
[
  'DELETE',
  'POST',
  'PUT'
].forEach((method) => {
  test(`client supports ${method}`, (t) => {
    t.plan(3)

    const opts = server.address()
    opts.method = method

    const client = new Client(opts)

    server.once('request', (req, res) => {
      t.equal(req.method, method, 'custom method matches')
    })

    client.on('response', (statusCode, length) => {
      t.equal(statusCode, 200, 'status code matches')
      t.ok(length > 'hello world'.length, 'length includes the headers')
      client.destroy()
    })
  })
})

test('client supports sending a body', (t) => {
  t.plan(4)

  const opts = server.address()
  opts.method = 'POST'
  opts.body = Buffer.from('hello world')

  const client = new Client(opts)

  server.once('request', (req, res) => {
    req.pipe(bl((err, body) => {
      t.error(err)
      t.same(body.toString(), opts.body.toString(), 'body matches')
    }))
  })

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    client.destroy()
  })
})

test('client supports sending a body which is a string', (t) => {
  t.plan(4)

  const opts = server.address()
  opts.method = 'POST'
  opts.body = 'hello world'

  const client = new Client(opts)

  server.once('request', (req, res) => {
    req.pipe(bl((err, body) => {
      t.error(err)
      t.same(body.toString(), opts.body, 'body matches')
    }))
  })

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    client.destroy()
  })
})

test('client supports sending a body passed on the CLI as JSON array', (t) => {
  t.plan(3)

  const body = [{ a: [{ b: 1 }] }]
  const jsonBody = JSON.stringify(body)

  // this odd format is parsed by the subarg parser when body is a JSON array
  const mangledBody = { _: [JSON.stringify(body[0])] }

  const opts = server.address()
  opts.method = 'POST'
  opts.body = mangledBody

  const client = new Client(opts)

  server.once('request', (req, res) => {
    req.pipe(bl((err, body) => {
      t.error(err)
      t.same(body.toString(), jsonBody, 'body matches')
    }))
  })

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    client.destroy()
  })
})

test('client supports changing the body', (t) => {
  t.plan(2)

  const opts = server.address()
  opts.method = 'POST'
  opts.body = 'hello world'

  const client = new Client(opts)

  t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...opts }), 'request is okay before modifying')

  const body = 'modified'
  client.setBody(body)

  t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...opts, body }), 'body changes updated request')
  client.destroy()
})

test('client supports changing the headers', (t) => {
  t.plan(2)

  const opts = server.address()
  opts.method = 'POST'

  const client = new Client(opts)
  t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...opts }), 'request is okay before modifying')

  const headers = { header: 'modified' }
  client.setHeaders(headers)

  t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...opts, headers }), 'header changes updated request')
  client.destroy()
})

test('client supports changing the headers and body', (t) => {
  t.plan(2)

  const opts = server.address()
  opts.body = 'hello world'
  opts.method = 'POST'

  const client = new Client(opts)

  t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...opts }), 'request is okay before modifying')

  const body = 'modified'
  const headers = { header: 'modifiedHeader' }
  client.setBody(body)
  client.setHeaders(headers)

  t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...opts, headers, body }), 'changes updated request')
  client.destroy()
})

test('client supports changing the headers and body together', (t) => {
  t.plan(2)

  const opts = server.address()
  opts.body = 'hello world'
  opts.method = 'POST'

  const client = new Client(opts)

  t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...opts }), 'request is okay before modifying')

  const body = 'modified'
  const headers = { header: 'modifiedHeader' }
  client.setHeadersAndBody(headers, body)

  t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...opts, headers, body }), 'changes updated request')
  client.destroy()
})

test('client supports changing the headers and body with null values', (t) => {
  t.plan(2)

  const opts = server.address()
  opts.body = 'hello world'
  opts.method = 'POST'

  const client = new Client(opts)

  t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...opts }), 'request is okay before modifying')

  client.setBody(null)
  client.setHeaders(null)

  t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, method: 'POST' }), 'changes updated request')
  client.destroy()
})

test('client supports changing the headers and body together with null values', (t) => {
  t.plan(2)

  const opts = server.address()
  opts.body = 'hello world'
  opts.method = 'POST'

  const client = new Client(opts)

  t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...opts }), 'request is okay before modifying')

  client.setHeadersAndBody(null, null)

  t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, method: 'POST' }), 'changes updated request')
  client.destroy()
})

test('client supports updating the current request object', (t) => {
  t.plan(2)

  const opts = server.address()
  opts.body = 'hello world'
  opts.method = 'POST'

  const client = new Client(opts)

  t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...opts }), 'request is okay before modifying')

  const newReq = {
    headers: {
      header: 'modifiedHeader'
    },
    body: 'modified',
    method: 'GET'
  }
  client.setRequest(newReq)

  t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...newReq }), 'changes updated request')
  client.destroy()
})

test('client customiseRequest function overwrites the headers and body', (t) => {
  t.plan(5)

  const opts = server.address()
  opts.body = 'hello world'
  opts.method = 'POST'
  const body = 'modified'
  const headers = { header: 'modifiedHeader' }
  opts.setupClient = (client) => {
    t.ok(client.setHeadersAndBody, 'client had setHeadersAndBody method')
    t.ok(client.setHeaders, 'client had setHeaders method')
    t.ok(client.setBody, 'client had setBody method')

    client.setHeadersAndBody(headers, body)
  }

  const client = new Client(opts)

  t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...opts, headers, body }), 'changes updated request')

  t.notSame(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...opts }), 'changes updated request')

  client.destroy()
})

test('client should throw when attempting to modify the request with a pipelining greater than 1', (t) => {
  t.plan(1)

  const opts = server.address()
  opts.pipelining = 10
  const client = new Client(opts)

  t.throws(() => client.setHeaders({}))

  client.destroy()
})

test('client pipelined requests count should equal pipelining when greater than 1', (t) => {
  t.plan(1)

  const opts = server.address()
  opts.pipelining = 10
  const client = new Client(opts)

  t.equal(client.pipelinedRequests.size(), client.opts.pipelining)

  client.destroy()
})

test('client should emit a timeout when no response is received', (t) => {
  t.plan(1)

  const opts = timeoutServer.address()
  opts.timeout = 1
  const client = new Client(opts)

  client.on('timeout', () => {
    t.ok(1, 'timeout should have happened')
    client.destroy()
  })
})

test('client should emit 2 timeouts when no responses are received', (t) => {
  t.plan(2)

  const opts = timeoutServer.address()
  opts.timeout = 1
  const client = new Client(opts)
  let count = 0
  client.on('timeout', () => {
    t.ok(1, 'timeout should have happened')
    if (count++ > 0) {
      client.destroy()
    }
  })
})

test('client should have 2 different requests it iterates over', (t) => {
  t.plan(3)
  const server = helper.startServer()
  const opts = server.address()

  const requests = [
    {
      method: 'POST',
      body: 'hello world again'
    },
    {
      method: 'GET',
      body: 'modified'
    }
  ]

  const client = new Client(opts)
  let number = 0
  client.setRequests(requests)
  client.on('response', (statusCode, length) => {
    number++
    switch (number) {
      case 1:
      case 3:
        t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...requests[0] }), 'request was okay')
        break
      case 2:
        t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...requests[1] }), 'body changes updated request')
        break
      case 4:
        client.destroy()
        t.end()
        break
    }
  })
})

test('client should emit reset when request iterator has reset', (t) => {
  t.plan(1)
  const server = helper.startServer()
  const opts = server.address()

  const requests = [
    {
      method: 'POST',
      body: 'hello world again'
    },
    {
      method: 'POST',
      body: 'modified',
      // falsey result will reset
      setupRequest: () => {}
    },
    {
      method: 'POST',
      body: 'never used'
    }
  ]

  const client = new Client(opts)
  client.setRequests(requests)
  client.on('reset', () => {
    client.destroy()
    t.end()
  })
  client.on('response', () => {
    t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...requests[0] }), 'first request was okay')
  })
})

test('client should stop when first setupRequest() fails', (t) => {
  t.plan(1)
  const server = helper.startServer()
  const opts = server.address()

  const client = new Client(opts)
  t.throws(
    () => client.setRequests([{ method: 'GET', setupRequest: () => {} }]),
    'First setupRequest() failed did not returned valid request. Stopping'
  )
  client.destroy()
  t.end()
})

test('client exposes response bodies and statuses', (t) => {
  const server = helper.startServer({
    body: ({ method }) => method === 'POST' ? 'hello!' : 'world!'
  })
  const opts = server.address()
  opts.requests = [
    {
      method: 'POST',
      body: 'hello world!',
      onResponse: (status, body) => responses.push({ status, body })
    },
    {
      method: 'POST',
      body: 'hello world again'
    },
    {
      method: 'GET',
      onResponse: (status, body) => responses.push({ status, body })
    }
  ]
  const responses = []

  const client = new Client(opts)
  let number = 0
  client.on('response', (statusCode, length) => {
    number++
    switch (number) {
      case 1:
        t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...opts.requests[0] }), 'first request')
        t.same(responses, [{
          status: 200,
          body: 'hello!'
        }])
        break
      case 2:
        t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...opts.requests[1] }), 'second request')
        t.same(responses, [{
          status: 200,
          body: 'hello!'
        }])
        break
      case 3:
        t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...opts.requests[2] }), 'third request')
        t.same(responses, [{
          status: 200,
          body: 'hello!'
        }, {
          status: 200,
          body: 'world!'
        }])
        break
      case 4:
        t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...opts.requests[0] }), 'first request')
        t.same(responses, [{
          status: 200,
          body: 'hello!'
        }, {
          status: 200,
          body: 'world!'
        }, {
          status: 200,
          body: 'hello!'
        }])
        client.destroy()
        t.end()
        break
    }
  })
})

test('client keeps context and reset it when looping on requests', (t) => {
  const server = helper.startServer()
  const opts = server.address()
  let number = 0
  const expectedResponse = 'hello world'

  opts.requests = [
    {
      method: 'POST',
      body: 'hello world again',
      onResponse: (status, body, context) => {
        if (number < 3) {
          t.same(context, {}, 'context was supposed to be null')
          context.previousRes = body
        }
      }
    },
    {
      method: 'PUT',
      setupRequest: (req, context) => {
        if (number < 3) {
          t.same(context, { previousRes: expectedResponse }, 'context was supposed to contain previous response')
        }
        return Object.assign({}, req, { body: context.previousRes })
      }
    }
  ]

  const client = new Client(opts)
  client.on('response', (statusCode, length) => {
    number++
    switch (number) {
      case 1:
        t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, ...opts.requests[0] }), 'hard-coded body')
        break
      case 2:
        t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, method: 'PUT', body: expectedResponse }), 'dynamic body')
        client.destroy()
        t.end()
        break
    }
  })
})

test('client supports http basic authentication', (t) => {
  t.plan(2)
  const server = helper.startServer()
  const opts = server.address()
  opts.auth = 'username:password'
  const client = new Client(opts)

  server.once('request', (req, res) => {
    t.equal(req.headers.authorization, 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=', 'authorization header matches')
  })

  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    client.destroy()
    t.end()
  })
})

test('should return client instance', (t) => {
  t.plan(1)
  const caller = {}
  const opts = server.address()
  opts.auth = 'username:password'
  const client = Client.call(caller, opts)

  t.type(client, Client)
  client.destroy()
})

test('client calls twice using socket on secure server', (t) => {
  t.plan(4)
  const socketPath = process.platform === 'win32'
    ? path.join('\\\\?\\pipe', process.cwd(), 'autocannon-' + Date.now())
    : path.join(os.tmpdir(), 'autocannon-' + Date.now() + '.sock')

  helper.startHttpsServer({ socketPath })
  const client = new Client({
    url: 'localhost',
    protocol: 'https:',
    socketPath,
    connections: 1
  })
  let count = 0
  client.on('response', (statusCode, length) => {
    t.equal(statusCode, 200, 'status code matches')
    t.ok(length > 'hello world'.length, 'length includes the headers')
    if (count++ > 0) {
      client.destroy()
      t.end()
    }
  })
})

test('client emits mistmatch when expectBody doesn\'t match actual body', (t) => {
  const responses = ['hello...', 'world!']
  const server = helper.startServer({
    body: ({ method }) => responses[method === 'POST' ? 0 : 1]
  })
  const opts = server.address()
  opts.requests = [
    {
      method: 'POST',
      body: 'hi there!'
    },
    {
      method: 'GET'
    }
  ]
  opts.expectBody = responses[0]

  const client = new Client(opts)
  client.on('mismatch', (body) => {
    // we expect body mismatch on second request
    t.same(body, responses[1])
    client.destroy()
    t.end()
  })
})

test('client invokes appropriate onResponse when using pipelining', (t) => {
  const server = helper.startServer({
    body: ({ method }) => method
  })
  const opts = server.address()
  opts.pipelining = 2
  const responses = []
  const onResponse = (status, body) => responses.push(body)
  opts.requests = [
    {
      method: 'POST',
      onResponse
    },
    {
      method: 'GET',
      onResponse
    },
    {
      method: 'PUT',
      onResponse
    }
  ]

  const client = new Client(opts)
  let number = 0
  client.on('response', (statusCode, length) => {
    number++
    switch (number) {
      case 1:
        // 1st & 2nd were sent, receiving 1st
        t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, method: 'GET' }), 'current should be second request')
        t.same(responses, ['POST'])
        break
      case 2:
        // 3rd was sent as 1st is finished, receiving 2nd
        t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, method: 'PUT' }), 'current should be third request')
        t.same(responses, ['POST', 'GET'])
        break
      case 3:
        // 1st was resent, receiving 3rd
        t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, method: 'POST' }), 'current should be first request')
        t.same(responses, ['POST', 'GET', 'PUT'])
        break
      case 4:
        // 2nd was resent, receiving 1st
        t.same(client.getRequestBuffer().toString(), makeResponseFromBody({ server, method: 'GET' }), 'current should be second request')
        t.same(responses, ['POST', 'GET', 'PUT', 'POST'])
        client.destroy()
        t.end()
        break
    }
  })
})

test('client supports receiving large response body', (t) => {
  t.plan(2)

  const mockBody = Array.from({ length: 1024 * 10 }, (_, i) => `str-${i}`).join('\n')
  const server = http.createServer((req, res) => {
    res.end(mockBody)
  })
  server.listen(0)
  server.unref()

  let onResponseCalled = 0
  const opts = server.address()
  opts.method = 'POST'
  opts.body = Buffer.from('hello world')
  opts.requests = [
    {
      path: '/',
      method: 'GET',
      onResponse: (...args) => {
        onResponseCalled++
      }
    }
  ]

  const client = new Client(opts)

  client.on('response', (statusCode, length) => {
    t.equal(onResponseCalled, 1, 'onResponse should be called only once')
    t.equal(statusCode, 200, 'status code matches')
    client.destroy()
  })
})
