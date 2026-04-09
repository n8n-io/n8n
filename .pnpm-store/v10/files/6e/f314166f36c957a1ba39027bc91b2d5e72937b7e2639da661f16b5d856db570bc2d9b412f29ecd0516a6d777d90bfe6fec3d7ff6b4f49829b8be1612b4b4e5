'use strict'

const test = require('tape')
const fastURI = require('../')

const uriJsParseFixtures = require('./fixtures/uri-js-parse.json')
const uriJsSerializeFixtures = require('./fixtures/uri-js-serialize.json')

test('uri-js compatibility Parse', (t) => {
  uriJsParseFixtures.forEach((
    [value, expected]
  ) => {
    if (value === '//10.10.000.10') {
      return t.skip('Skipping //10.10.000.10 as it is not a valid URI per URI spec: https://datatracker.ietf.org/doc/html/rfc5954#section-4.1')
    }
    if (value.slice(0, 6) === 'mailto') {
      return t.skip('Skipping mailto schema test as it is not supported by fastifyURI')
    }
    t.same(JSON.parse(JSON.stringify(fastURI.parse(value))), expected, 'Compatibility parse: ' + value)
  })
  t.end()
})

test('uri-js compatibility serialize', (t) => {
  uriJsSerializeFixtures.forEach(([value, expected]) => {
    t.same(
      fastURI.serialize(value),
      expected,
      'Compatibility serialize: ' + JSON.stringify(value)
    )
  })
  t.end()
})
