'use strict'

const test = require('tape')
const fastURI = require('..')

test('URI Serialize', (t) => {
  let components = {
    scheme: undefined,
    userinfo: undefined,
    host: undefined,
    port: undefined,
    path: undefined,
    query: undefined,
    fragment: undefined
  }
  t.equal(fastURI.serialize(components), '', 'Undefined Components')

  components = {
    scheme: '',
    userinfo: '',
    host: '',
    port: 0,
    path: '',
    query: '',
    fragment: ''
  }
  t.equal(fastURI.serialize(components), '//@:0?#', 'Empty Components')

  components = {
    scheme: 'uri',
    userinfo: 'foo:bar',
    host: 'example.com',
    port: 1,
    path: 'path',
    query: 'query',
    fragment: 'fragment'
  }
  t.equal(fastURI.serialize(components), 'uri://foo:bar@example.com:1/path?query#fragment', 'All Components')

  components = {
    scheme: 'uri',
    host: 'example.com',
    port: '9000'
  }
  t.equal(fastURI.serialize(components), 'uri://example.com:9000', 'String port')

  t.equal(fastURI.serialize({ path: '//path' }), '/%2Fpath', 'Double slash path')
  t.equal(fastURI.serialize({ path: 'foo:bar' }), 'foo%3Abar', 'Colon path')
  t.equal(fastURI.serialize({ path: '?query' }), '%3Fquery', 'Query path')

  t.equal(fastURI.serialize({ host: '10.10.10.10' }), '//10.10.10.10', 'IPv4address')

  // mixed IPv4address & reg-name, example from terion-name (https://github.com/garycourt/uri-js/issues/4)
  t.equal(fastURI.serialize({ host: '10.10.10.10.example.com' }), '//10.10.10.10.example.com', 'Mixed IPv4address & reg-name')

  // IPv6address
  t.equal(fastURI.serialize({ host: '2001:db8::7' }), '//[2001:db8::7]', 'IPv6 Host')
  t.equal(fastURI.serialize({ host: '::ffff:129.144.52.38' }), '//[::ffff:129.144.52.38]', 'IPv6 Mixed Host')
  t.equal(fastURI.serialize({ host: '2606:2800:220:1:248:1893:25c8:1946' }), '//[2606:2800:220:1:248:1893:25c8:1946]', 'IPv6 Full Host')

  // IPv6address with zone identifier, RFC 6874
  t.equal(fastURI.serialize({ host: 'fe80::a%en1' }), '//[fe80::a%25en1]', 'IPv6 Zone Unescaped Host')
  t.equal(fastURI.serialize({ host: 'fe80::a%25en1' }), '//[fe80::a%25en1]', 'IPv6 Zone Escaped Host')

  t.end()
})

test('WS serialize', (t) => {
  t.equal(fastURI.serialize({ scheme: 'ws' }), 'ws:')
  t.equal(fastURI.serialize({ scheme: 'ws', host: 'example.com' }), 'ws://example.com')
  t.equal(fastURI.serialize({ scheme: 'ws', resourceName: '/' }), 'ws:')
  t.equal(fastURI.serialize({ scheme: 'ws', resourceName: '/foo' }), 'ws:/foo')
  t.equal(fastURI.serialize({ scheme: 'ws', resourceName: '/foo?bar' }), 'ws:/foo?bar')
  t.equal(fastURI.serialize({ scheme: 'ws', secure: false }), 'ws:')
  t.equal(fastURI.serialize({ scheme: 'ws', secure: true }), 'wss:')
  t.equal(fastURI.serialize({ scheme: 'ws', host: 'example.com', resourceName: '/foo' }), 'ws://example.com/foo')
  t.equal(fastURI.serialize({ scheme: 'ws', host: 'example.com', resourceName: '/foo?bar' }), 'ws://example.com/foo?bar')
  t.equal(fastURI.serialize({ scheme: 'ws', host: 'example.com', secure: false }), 'ws://example.com')
  t.equal(fastURI.serialize({ scheme: 'ws', host: 'example.com', secure: true }), 'wss://example.com')
  t.equal(fastURI.serialize({ scheme: 'ws', host: 'example.com', resourceName: '/foo?bar', secure: false }), 'ws://example.com/foo?bar')
  t.equal(fastURI.serialize({ scheme: 'ws', host: 'example.com', resourceName: '/foo?bar', secure: true }), 'wss://example.com/foo?bar')
  t.end()
})

test('WSS serialize', (t) => {
  t.equal(fastURI.serialize({ scheme: 'wss' }), 'wss:')
  t.equal(fastURI.serialize({ scheme: 'wss', host: 'example.com' }), 'wss://example.com')
  t.equal(fastURI.serialize({ scheme: 'wss', resourceName: '/' }), 'wss:')
  t.equal(fastURI.serialize({ scheme: 'wss', resourceName: '/foo' }), 'wss:/foo')
  t.equal(fastURI.serialize({ scheme: 'wss', resourceName: '/foo?bar' }), 'wss:/foo?bar')
  t.equal(fastURI.serialize({ scheme: 'wss', secure: false }), 'ws:')
  t.equal(fastURI.serialize({ scheme: 'wss', secure: true }), 'wss:')
  t.equal(fastURI.serialize({ scheme: 'wss', host: 'example.com', resourceName: '/foo' }), 'wss://example.com/foo')
  t.equal(fastURI.serialize({ scheme: 'wss', host: 'example.com', resourceName: '/foo?bar' }), 'wss://example.com/foo?bar')
  t.equal(fastURI.serialize({ scheme: 'wss', host: 'example.com', secure: false }), 'ws://example.com')
  t.equal(fastURI.serialize({ scheme: 'wss', host: 'example.com', secure: true }), 'wss://example.com')
  t.equal(fastURI.serialize({ scheme: 'wss', host: 'example.com', resourceName: '/foo?bar', secure: false }), 'ws://example.com/foo?bar')
  t.equal(fastURI.serialize({ scheme: 'wss', host: 'example.com', resourceName: '/foo?bar', secure: true }), 'wss://example.com/foo?bar')

  t.end()
})

test('URN serialize', (t) => {
  // example from RFC 2141
  const components = {
    scheme: 'urn',
    nid: 'foo',
    nss: 'a123,456'
  }
  t.equal(fastURI.serialize(components), 'urn:foo:a123,456')
  // example from RFC 4122
  let uuidcomponents = {
    scheme: 'urn',
    nid: 'uuid',
    uuid: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6'
  }
  t.equal(fastURI.serialize(uuidcomponents), 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6')

  uuidcomponents = {
    scheme: 'urn',
    nid: 'uuid',
    uuid: 'notauuid-7dec-11d0-a765-00a0c91e6bf6'
  }
  t.equal(fastURI.serialize(uuidcomponents), 'urn:uuid:notauuid-7dec-11d0-a765-00a0c91e6bf6')

  uuidcomponents = {
    scheme: 'urn',
    nid: undefined,
    uuid: 'notauuid-7dec-11d0-a765-00a0c91e6bf6'
  }
  t.throws(() => { fastURI.serialize(uuidcomponents) }, 'URN without nid cannot be serialized')

  t.end()
})
test('URN NID Override', (t) => {
  let components = fastURI.parse('urn:foo:f81d4fae-7dec-11d0-a765-00a0c91e6bf6', { nid: 'uuid' })
  t.equal(components.error, undefined, 'errors')
  t.equal(components.scheme, 'urn', 'scheme')
  t.equal(components.path, undefined, 'path')
  t.equal(components.nid, 'foo', 'nid')
  t.equal(components.nss, undefined, 'nss')
  t.equal(components.uuid, 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6', 'uuid')

  components = {
    scheme: 'urn',
    nid: 'foo',
    uuid: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6'
  }
  t.equal(fastURI.serialize(components, { nid: 'uuid' }), 'urn:foo:f81d4fae-7dec-11d0-a765-00a0c91e6bf6')
  t.end()
})
