import { Bench } from 'tinybench'
import { fastUri } from '../index.js'
import { parse as uriJsParse, serialize as uriJsSerialize, resolve as uriJsResolve, equal as uriJsEqual } from 'uri-js'

const base = 'uri://a/b/c/d;p?q'

const domain = 'https://example.com/foo#bar$fiz'
const ipv4 = '//10.10.10.10'
const ipv6 = '//[2001:db8::7]'
const urn = 'urn:foo:a123,456'
const urnuuid = 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6'

const urnuuidComponent = {
  scheme: 'urn',
  nid: 'uuid',
  uuid: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6'
}

const {
  parse: fastUriParse,
  serialize: fastUriSerialize,
  resolve: fastUriResolve,
  equal: fastUriEqual,
} = fastUri

// Initialization as there is a lot to parse at first
// eg: regexes
fastUriParse(domain)
uriJsParse(domain)

const benchFastUri = new Bench({ name: 'fast-uri benchmark' })
const benchUriJs = new Bench({ name: 'uri-js benchmark' })
const benchWHATWG = new Bench({ name: 'WHATWG URL benchmark' })

benchFastUri.add('fast-uri: parse domain', function () {
  fastUriParse(domain)
})
benchUriJs.add('urijs: parse domain', function () {
  uriJsParse(domain)
})
benchWHATWG.add('WHATWG URL: parse domain', function () {
  // eslint-disable-next-line
  new URL(domain)
})
benchFastUri.add('fast-uri: parse IPv4', function () {
  fastUriParse(ipv4)
})
benchUriJs.add('urijs: parse IPv4', function () {
  uriJsParse(ipv4)
})
benchFastUri.add('fast-uri: parse IPv6', function () {
  fastUriParse(ipv6)
})
benchUriJs.add('urijs: parse IPv6', function () {
  uriJsParse(ipv6)
})
benchFastUri.add('fast-uri: parse URN', function () {
  fastUriParse(urn)
})
benchUriJs.add('urijs: parse URN', function () {
  uriJsParse(urn)
})
benchWHATWG.add('WHATWG URL: parse URN', function () {
  // eslint-disable-next-line
  new URL(urn)
})
benchFastUri.add('fast-uri: parse URN uuid', function () {
  fastUriParse(urnuuid)
})
benchUriJs.add('urijs: parse URN uuid', function () {
  uriJsParse(urnuuid)
})
benchFastUri.add('fast-uri: serialize URN uuid', function () {
  fastUriSerialize(urnuuidComponent)
})
benchUriJs.add('uri-js: serialize URN uuid', function () {
  uriJsSerialize(urnuuidComponent)
})
benchFastUri.add('fast-uri: serialize uri', function () {
  fastUriSerialize({
    scheme: 'uri',
    userinfo: 'foo:bar',
    host: 'example.com',
    port: 1,
    path: 'path',
    query: 'query',
    fragment: 'fragment'
  })
})
benchUriJs.add('urijs: serialize uri', function () {
  uriJsSerialize({
    scheme: 'uri',
    userinfo: 'foo:bar',
    host: 'example.com',
    port: 1,
    path: 'path',
    query: 'query',
    fragment: 'fragment'
  })
})
benchFastUri.add('fast-uri: serialize long uri with dots', function () {
  fastUriSerialize({
    scheme: 'uri',
    userinfo: 'foo:bar',
    host: 'example.com',
    port: 1,
    path: './a/./b/c/../.././d/../e/f/.././/',
    query: 'query',
    fragment: 'fragment'
  })
})
benchUriJs.add('urijs: serialize long uri with dots', function () {
  uriJsSerialize({
    scheme: 'uri',
    userinfo: 'foo:bar',
    host: 'example.com',
    port: 1,
    path: './a/./b/c/../.././d/../e/f/.././/',
    query: 'query',
    fragment: 'fragment'
  })
})
benchFastUri.add('fast-uri: serialize IPv6', function () {
  fastUriSerialize({ host: '2606:2800:220:1:248:1893:25c8:1946' })
})
benchUriJs.add('urijs: serialize IPv6', function () {
  uriJsSerialize({ host: '2606:2800:220:1:248:1893:25c8:1946' })
})
benchFastUri.add('fast-uri: serialize ws', function () {
  fastUriSerialize({ scheme: 'ws', host: 'example.com', resourceName: '/foo?bar', secure: true })
})
benchUriJs.add('urijs: serialize ws', function () {
  uriJsSerialize({ scheme: 'ws', host: 'example.com', resourceName: '/foo?bar', secure: true })
})
benchFastUri.add('fast-uri: resolve', function () {
  fastUriResolve(base, '../../../g')
})
benchUriJs.add('urijs: resolve', function () {
  uriJsResolve(base, '../../../g')
})

benchFastUri.add('fast-uri: equal', function () {
  fastUriEqual('example://a/b/c/%7Bfoo%7D', 'eXAMPLE://a/./b/../b/%63/%7bfoo%7d')
})
benchUriJs.add('urijs: equal', function () {
  uriJsEqual('example://a/b/c/%7Bfoo%7D', 'eXAMPLE://a/./b/../b/%63/%7bfoo%7d')
})

await benchFastUri.run()
console.log(benchFastUri.name)
console.table(benchFastUri.table())

await benchUriJs.run()
console.log(benchUriJs.name)
console.table(benchUriJs.table())

await benchWHATWG.run()
console.log(benchWHATWG.name)
console.table(benchWHATWG.table())
