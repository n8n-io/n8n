'use strict'

const test = require('tape')
const fastURI = require('..')

test('URI Resolving', (t) => {
  // normal examples from RFC 3986
  const base = 'uri://a/b/c/d;p?q'
  t.equal(fastURI.resolve(base, 'g:h'), 'g:h', 'g:h')
  t.equal(fastURI.resolve(base, 'g:h'), 'g:h', 'g:h')
  t.equal(fastURI.resolve(base, 'g'), 'uri://a/b/c/g', 'g')
  t.equal(fastURI.resolve(base, './g'), 'uri://a/b/c/g', './g')
  t.equal(fastURI.resolve(base, 'g/'), 'uri://a/b/c/g/', 'g/')
  t.equal(fastURI.resolve(base, '/g'), 'uri://a/g', '/g')
  t.equal(fastURI.resolve(base, '//g'), 'uri://g', '//g')
  t.equal(fastURI.resolve(base, '?y'), 'uri://a/b/c/d;p?y', '?y')
  t.equal(fastURI.resolve(base, 'g?y'), 'uri://a/b/c/g?y', 'g?y')
  t.equal(fastURI.resolve(base, '#s'), 'uri://a/b/c/d;p?q#s', '#s')
  t.equal(fastURI.resolve(base, 'g#s'), 'uri://a/b/c/g#s', 'g#s')
  t.equal(fastURI.resolve(base, 'g?y#s'), 'uri://a/b/c/g?y#s', 'g?y#s')
  t.equal(fastURI.resolve(base, ';x'), 'uri://a/b/c/;x', ';x')
  t.equal(fastURI.resolve(base, 'g;x'), 'uri://a/b/c/g;x', 'g;x')
  t.equal(fastURI.resolve(base, 'g;x?y#s'), 'uri://a/b/c/g;x?y#s', 'g;x?y#s')
  t.equal(fastURI.resolve(base, ''), 'uri://a/b/c/d;p?q', '')
  t.equal(fastURI.resolve(base, '.'), 'uri://a/b/c/', '.')
  t.equal(fastURI.resolve(base, './'), 'uri://a/b/c/', './')
  t.equal(fastURI.resolve(base, '..'), 'uri://a/b/', '..')
  t.equal(fastURI.resolve(base, '../'), 'uri://a/b/', '../')
  t.equal(fastURI.resolve(base, '../g'), 'uri://a/b/g', '../g')
  t.equal(fastURI.resolve(base, '../..'), 'uri://a/', '../..')
  t.equal(fastURI.resolve(base, '../../'), 'uri://a/', '../../')
  t.equal(fastURI.resolve(base, '../../g'), 'uri://a/g', '../../g')

  // abnormal examples from RFC 3986
  t.equal(fastURI.resolve(base, '../../../g'), 'uri://a/g', '../../../g')
  t.equal(fastURI.resolve(base, '../../../../g'), 'uri://a/g', '../../../../g')

  t.equal(fastURI.resolve(base, '/./g'), 'uri://a/g', '/./g')
  t.equal(fastURI.resolve(base, '/../g'), 'uri://a/g', '/../g')
  t.equal(fastURI.resolve(base, 'g.'), 'uri://a/b/c/g.', 'g.')
  t.equal(fastURI.resolve(base, '.g'), 'uri://a/b/c/.g', '.g')
  t.equal(fastURI.resolve(base, 'g..'), 'uri://a/b/c/g..', 'g..')
  t.equal(fastURI.resolve(base, '..g'), 'uri://a/b/c/..g', '..g')

  t.equal(fastURI.resolve(base, './../g'), 'uri://a/b/g', './../g')
  t.equal(fastURI.resolve(base, './g/.'), 'uri://a/b/c/g/', './g/.')
  t.equal(fastURI.resolve(base, 'g/./h'), 'uri://a/b/c/g/h', 'g/./h')
  t.equal(fastURI.resolve(base, 'g/../h'), 'uri://a/b/c/h', 'g/../h')
  t.equal(fastURI.resolve(base, 'g;x=1/./y'), 'uri://a/b/c/g;x=1/y', 'g;x=1/./y')
  t.equal(fastURI.resolve(base, 'g;x=1/../y'), 'uri://a/b/c/y', 'g;x=1/../y')

  t.equal(fastURI.resolve(base, 'g?y/./x'), 'uri://a/b/c/g?y/./x', 'g?y/./x')
  t.equal(fastURI.resolve(base, 'g?y/../x'), 'uri://a/b/c/g?y/../x', 'g?y/../x')
  t.equal(fastURI.resolve(base, 'g#s/./x'), 'uri://a/b/c/g#s/./x', 'g#s/./x')
  t.equal(fastURI.resolve(base, 'g#s/../x'), 'uri://a/b/c/g#s/../x', 'g#s/../x')

  t.equal(fastURI.resolve(base, 'uri:g'), 'uri:g', 'uri:g')
  t.equal(fastURI.resolve(base, 'uri:g', {}), 'uri:g', 'uri:g')
  t.equal(fastURI.resolve(base, 'uri:g', { tolerant: undefined }), 'uri:g', 'uri:g')
  t.equal(fastURI.resolve(base, 'uri:g', { tolerant: false }), 'uri:g', 'uri:g')
  t.equal(fastURI.resolve(base, 'uri:g', { tolerant: true }), 'uri://a/b/c/g', 'uri:g')

  // examples by PAEz
  // example was provided to avoid infinite loop within regex
  // this is not the case anymore
  // t.equal(URI.resolve('//www.g.com/', '/adf\ngf'), '//www.g.com/adf%0Agf', '/adf\\ngf')
  // t.equal(URI.resolve('//www.g.com/error\n/bleh/bleh', '..'), '//www.g.com/error%0A/', '//www.g.com/error\\n/bleh/bleh')
  t.end()
})

test('URN Resolving', (t) => {
  // example from epoberezkin
  t.equal(fastURI.resolve('', 'urn:some:ip:prop'), 'urn:some:ip:prop', 'urn:some:ip:prop')
  t.equal(fastURI.resolve('#', 'urn:some:ip:prop'), 'urn:some:ip:prop', 'urn:some:ip:prop')
  t.equal(fastURI.resolve('urn:some:ip:prop', 'urn:some:ip:prop'), 'urn:some:ip:prop', 'urn:some:ip:prop')
  t.equal(fastURI.resolve('urn:some:other:prop', 'urn:some:ip:prop'), 'urn:some:ip:prop', 'urn:some:ip:prop')
  t.end()
})
