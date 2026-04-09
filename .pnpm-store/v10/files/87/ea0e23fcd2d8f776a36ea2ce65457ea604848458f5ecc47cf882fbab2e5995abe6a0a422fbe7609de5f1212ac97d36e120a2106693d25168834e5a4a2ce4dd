'use strict'

const test = require('tape')
const fastURI = require('..')

test('RFC 3986', (t) => {
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '/', secure: true }),
    'http://example.com/', 'http://example.com/')
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '/foo', secure: true }),
    'http://example.com/foo', 'http://example.com/foo')

  // A.  If the input buffer begins with a prefix of "../" or "./",
  //     then remove that prefix from the input buffer; otherwise,

  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '../', secure: true }),
    'http://example.com/', 'http://example.com/')
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: './', secure: true }),
    'http://example.com/', 'http://example.com/')

  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '../../', secure: true }),
    'http://example.com/', 'http://example.com/')
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '././', secure: true }),
    'http://example.com/', 'http://example.com/')

  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: './../', secure: true }),
    'http://example.com/', 'http://example.com/')
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '.././', secure: true }),
    'http://example.com/', 'http://example.com/')

  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '../foo', secure: true }),
    'http://example.com/foo', 'http://example.com/foo')
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: './foo', secure: true }),
    'http://example.com/foo', 'http://example.com/foo')

  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '../../foo', secure: true }),
    'http://example.com/foo', 'http://example.com/foo')
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '././foo', secure: true }),
    'http://example.com/foo', 'http://example.com/foo')

  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: './../foo', secure: true }),
    'http://example.com/foo', 'http://example.com/foo')
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '.././foo', secure: true }),
    'http://example.com/foo', 'http://example.com/foo')

  // B.  if the input buffer begins with a prefix of "/./" or "/.",
  //     where "." is a complete path segment, then replace that
  //     prefix with "/" in the input buffer; otherwise,

  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '/./', secure: true }),
    'http://example.com/', 'http://example.com/')
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '/.', secure: true }),
    'http://example.com/', 'http://example.com/')
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '/./foo', secure: true }),
    'http://example.com/foo', 'http://example.com/foo')
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '/.././foo', secure: true }),
    'http://example.com/foo', 'http://example.com/foo')

  // C.  if the input buffer begins with a prefix of "/../" or "/..",
  //     where ".." is a complete path segment, then replace that
  //     prefix with "/" in the input buffer and remove the last
  //     segment and its preceding "/" (if any) from the output
  //     buffer; otherwise,

  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '/../', secure: true }),
    'http://example.com/', 'http://example.com/')
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '/..', secure: true }),
    'http://example.com/', 'http://example.com/')
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '/../foo', secure: true }),
    'http://example.com/foo', 'http://example.com/foo')
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '/foo/..', secure: true }),
    'http://example.com/', 'http://example.com/')
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '/foo/bar/..', secure: true }),
    'http://example.com/foo/', 'http://example.com/foo/')
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '/foo/../bar/..', secure: true }),
    'http://example.com/', 'http://example.com/')

  // D.  if the input buffer consists only of "." or "..", then remove
  //     that from the input buffer; otherwise,

  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '/.', secure: true }),
    'http://example.com/', 'http://example.com/')
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '/..', secure: true }),
    'http://example.com/', 'http://example.com/')
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '.', secure: true }),
    'http://example.com/', 'http://example.com/')
  t.strictEqual(fastURI.serialize({ scheme: 'http', host: 'example.com', path: '..', secure: true }),
    'http://example.com/', 'http://example.com/')

  t.end()
})
