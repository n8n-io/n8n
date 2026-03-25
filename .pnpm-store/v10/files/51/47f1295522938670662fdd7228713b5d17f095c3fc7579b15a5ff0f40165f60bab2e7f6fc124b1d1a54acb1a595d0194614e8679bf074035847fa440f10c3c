'use strict'

const test = require('tap').test
const helper = require('./helper')
const server = helper.startServer()
const RequestBuilder = require('../lib/httpRequestBuilder')
const httpMethods = require('../lib/httpMethods')

test('request builder should create a request with sensible defaults', (t) => {
  t.plan(1)

  const opts = server.address()

  const build = RequestBuilder(opts)

  const result = build()
  t.same(result,
    Buffer.from(`GET / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\n\r\n`),
    'request is okay')
})

test('request builder should allow default overwriting', (t) => {
  t.plan(1)

  const opts = server.address()
  opts.method = 'POST'

  const build = RequestBuilder(opts)

  const result = build()
  t.same(result,
    Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\n\r\n`),
    'request is okay')
})

test('request builder should allow per build overwriting', (t) => {
  t.plan(1)

  const opts = server.address()
  opts.method = 'POST'

  const build = RequestBuilder(opts)

  const result = build({ method: 'GET' })

  t.same(result,
    Buffer.from(`GET / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\n\r\n`),
    'request is okay')
})

test('request builder should throw on unknown http method', (t) => {
  t.plan(1)

  const opts = server.address()

  const build = RequestBuilder(opts)

  t.throws(() => build({ method: 'UNKNOWN' }))
})

test('request builder should accept all valid standard http methods', (t) => {
  t.plan(httpMethods.length)
  httpMethods.forEach((method) => {
    const opts = server.address()

    const build = RequestBuilder(opts)

    t.doesNotThrow(() => build({ method }), `${method} should be usable by the request builded`)
  })
  t.end()
})

test('request builder should add a Content-Length header when the body buffer exists as a default override', (t) => {
  t.plan(1)

  const opts = server.address()
  opts.method = 'POST'
  opts.body = 'body'

  const build = RequestBuilder(opts)

  const result = build()
  t.same(result,
    Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 4\r\n\r\nbody`),
    'request is okay')
})

test('request builder should add a Content-Length header when the body buffer exists as per build override', (t) => {
  t.plan(1)

  const opts = server.address()
  opts.method = 'POST'

  const build = RequestBuilder(opts)

  const result = build({ body: 'body' })
  t.same(result,
    Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 4\r\n\r\nbody`),
    'request is okay')
})

test('request builder should add only one HOST header', (t) => {
  t.plan(1)

  const opts = server.address()
  opts.method = 'POST'
  opts.headers = {
    Host: 'example.com'
  }

  const build = RequestBuilder(opts)

  const result = build({ body: 'body' })
  t.same(result,
    Buffer.from('POST / HTTP/1.1\r\nConnection: keep-alive\r\nHost: example.com\r\nContent-Length: 4\r\n\r\nbody'),
    'request is okay')
})

test('request builder should add a Content-Length header with correct calculated value when the body buffer exists and idReplacement is enabled as a default override', (t) => {
  t.plan(1)

  const opts = server.address()
  opts.method = 'POST'
  opts.body = '[<id>]'
  opts.idReplacement = true

  const build = RequestBuilder(opts)

  const result = build()
  t.same(result,
    Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 33\r\n\r\n[<id>]`),
    'request is okay')
})

test('request builder should add a Content-Length header with value "[<contentLength>]" when the body buffer exists and idReplacement is enabled as a per build override', (t) => {
  t.plan(1)

  const opts = server.address()
  opts.method = 'POST'
  opts.body = '[<id>]'

  const build = RequestBuilder(opts)

  const result = build({ idReplacement: true })
  t.same(result,
    Buffer.from(`POST / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nContent-Length: 33\r\n\r\n[<id>]`),
    'request is okay')
})

test('request builder should allow http basic authentication', (t) => {
  t.plan(1)

  const opts = server.address()
  opts.auth = 'username:password'

  const build = RequestBuilder(opts)

  const result = build()
  t.same(result,
    Buffer.from(`GET / HTTP/1.1\r\nHost: localhost:${server.address().port}\r\nConnection: keep-alive\r\nAuthorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=\r\n\r\n`),
    'request is okay')
})

test('should throw error if body is not a string or a buffer', (t) => {
  t.plan(1)

  const opts = server.address()

  const build = RequestBuilder(opts)

  try {
    build({ body: [] })
  } catch (error) {
    t.equal(error.message, 'body must be either a string or a buffer')
  }
})
