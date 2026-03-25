'use strict'

const {
  ok,
  same: deepEqual,
  strictSame: strictEqual,
  notSame: notStrictEqual,
  test: tapTest
} = require('tap')

const test = function () {
  if (typeof arguments[2] === 'function') {
    tapTest(arguments[0], arguments[1], t => {
      arguments[2](t)
      t.end()
    })
  } else {
    tapTest(arguments[0], t => {
      arguments[1](t)
      t.end()
    })
  }
}

const URI = require('../index')

/**
 * URI.js
 *
 * @fileoverview An RFC 3986 compliant, scheme extendable URI parsing/normalizing/resolving/serializing library for JavaScript.
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/uri-js
 */

/**
 * Copyright 2011 Gary Court. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are
 * permitted provided that the following conditions are met:
 *
 *    1. Redistributions of source code must retain the above copyright notice, this list of
 *       conditions and the following disclaimer.
 *
 *    2. Redistributions in binary form must reproduce the above copyright notice, this list
 *       of conditions and the following disclaimer in the documentation and/or other materials
 *       provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY GARY COURT ``AS IS'' AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GARY COURT OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * The views and conclusions contained in the software and documentation are those of the
 * authors and should not be interpreted as representing official policies, either expressed
 * or implied, of Gary Court.
 */

test('Acquire URI', function () {
  // URI = require("./uri").URI;
  ok(URI)
})

test('URI Parsing', function () {
  let components

  // scheme
  components = URI.parse('uri:')
  strictEqual(components.error, undefined, 'scheme errors')
  strictEqual(components.scheme, 'uri', 'scheme')
  // strictEqual(components.authority, undefined, "authority");
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, undefined, 'host')
  strictEqual(components.port, undefined, 'port')
  strictEqual(components.path, '', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, undefined, 'fragment')

  // userinfo
  components = URI.parse('//@')
  strictEqual(components.error, undefined, 'userinfo errors')
  strictEqual(components.scheme, undefined, 'scheme')
  // strictEqual(components.authority, "@", "authority");
  strictEqual(components.userinfo, '', 'userinfo')
  strictEqual(components.host, '', 'host')
  strictEqual(components.port, undefined, 'port')
  strictEqual(components.path, '', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, undefined, 'fragment')

  // host
  components = URI.parse('//')
  strictEqual(components.error, undefined, 'host errors')
  strictEqual(components.scheme, undefined, 'scheme')
  // strictEqual(components.authority, "", "authority");
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, '', 'host')
  strictEqual(components.port, undefined, 'port')
  strictEqual(components.path, '', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, undefined, 'fragment')

  // port
  components = URI.parse('//:')
  strictEqual(components.error, undefined, 'port errors')
  strictEqual(components.scheme, undefined, 'scheme')
  // strictEqual(components.authority, ":", "authority");
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, '', 'host')
  strictEqual(components.port, '', 'port')
  strictEqual(components.path, '', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, undefined, 'fragment')

  // path
  components = URI.parse('')
  strictEqual(components.error, undefined, 'path errors')
  strictEqual(components.scheme, undefined, 'scheme')
  // strictEqual(components.authority, undefined, "authority");
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, undefined, 'host')
  strictEqual(components.port, undefined, 'port')
  strictEqual(components.path, '', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, undefined, 'fragment')

  // query
  components = URI.parse('?')
  strictEqual(components.error, undefined, 'query errors')
  strictEqual(components.scheme, undefined, 'scheme')
  // strictEqual(components.authority, undefined, "authority");
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, undefined, 'host')
  strictEqual(components.port, undefined, 'port')
  strictEqual(components.path, '', 'path')
  strictEqual(components.query, '', 'query')
  strictEqual(components.fragment, undefined, 'fragment')

  // fragment
  components = URI.parse('#')
  strictEqual(components.error, undefined, 'fragment errors')
  strictEqual(components.scheme, undefined, 'scheme')
  // strictEqual(components.authority, undefined, "authority");
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, undefined, 'host')
  strictEqual(components.port, undefined, 'port')
  strictEqual(components.path, '', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, '', 'fragment')

  // fragment with character tabulation
  components = URI.parse('#\t')
  strictEqual(components.error, undefined, 'path errors')
  strictEqual(components.scheme, undefined, 'scheme')
  // strictEqual(components.authority, undefined, "authority");
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, undefined, 'host')
  strictEqual(components.port, undefined, 'port')
  strictEqual(components.path, '', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, '%09', 'fragment')

  // fragment with line feed
  components = URI.parse('#\n')
  strictEqual(components.error, undefined, 'path errors')
  strictEqual(components.scheme, undefined, 'scheme')
  // strictEqual(components.authority, undefined, "authority");
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, undefined, 'host')
  strictEqual(components.port, undefined, 'port')
  strictEqual(components.path, '', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, '%0A', 'fragment')

  // fragment with line tabulation
  components = URI.parse('#\v')
  strictEqual(components.error, undefined, 'path errors')
  strictEqual(components.scheme, undefined, 'scheme')
  // strictEqual(components.authority, undefined, "authority");
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, undefined, 'host')
  strictEqual(components.port, undefined, 'port')
  strictEqual(components.path, '', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, '%0B', 'fragment')

  // fragment with form feed
  components = URI.parse('#\f')
  strictEqual(components.error, undefined, 'path errors')
  strictEqual(components.scheme, undefined, 'scheme')
  // strictEqual(components.authority, undefined, "authority");
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, undefined, 'host')
  strictEqual(components.port, undefined, 'port')
  strictEqual(components.path, '', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, '%0C', 'fragment')

  // fragment with carriage return
  components = URI.parse('#\r')
  strictEqual(components.error, undefined, 'path errors')
  strictEqual(components.scheme, undefined, 'scheme')
  // strictEqual(components.authority, undefined, "authority");
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, undefined, 'host')
  strictEqual(components.port, undefined, 'port')
  strictEqual(components.path, '', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, '%0D', 'fragment')

  // all
  components = URI.parse('uri://user:pass@example.com:123/one/two.three?q1=a1&q2=a2#body')
  strictEqual(components.error, undefined, 'all errors')
  strictEqual(components.scheme, 'uri', 'scheme')
  // strictEqual(components.authority, "user:pass@example.com:123", "authority");
  strictEqual(components.userinfo, 'user:pass', 'userinfo')
  strictEqual(components.host, 'example.com', 'host')
  strictEqual(components.port, 123, 'port')
  strictEqual(components.path, '/one/two.three', 'path')
  strictEqual(components.query, 'q1=a1&q2=a2', 'query')
  strictEqual(components.fragment, 'body', 'fragment')

  // IPv4address
  components = URI.parse('//10.10.10.10')
  strictEqual(components.error, undefined, 'IPv4address errors')
  strictEqual(components.scheme, undefined, 'scheme')
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, '10.10.10.10', 'host')
  strictEqual(components.port, undefined, 'port')
  strictEqual(components.path, '', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, undefined, 'fragment')

  // IPv6address
  components = URI.parse('//[2001:db8::7]')
  strictEqual(components.error, undefined, 'IPv4address errors')
  strictEqual(components.scheme, undefined, 'scheme')
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, '2001:db8::7', 'host')
  strictEqual(components.port, undefined, 'port')
  strictEqual(components.path, '', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, undefined, 'fragment')

  // mixed IPv4address & IPv6address
  components = URI.parse('//[::ffff:129.144.52.38]')
  strictEqual(components.error, undefined, 'IPv4address errors')
  strictEqual(components.scheme, undefined, 'scheme')
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, '::ffff:129.144.52.38', 'host')
  strictEqual(components.port, undefined, 'port')
  strictEqual(components.path, '', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, undefined, 'fragment')

  // mixed IPv4address & reg-name, example from terion-name (https://github.com/garycourt/uri-js/issues/4)
  components = URI.parse('uri://10.10.10.10.example.com/en/process')
  strictEqual(components.error, undefined, 'mixed errors')
  strictEqual(components.scheme, 'uri', 'scheme')
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, '10.10.10.10.example.com', 'host')
  strictEqual(components.port, undefined, 'port')
  strictEqual(components.path, '/en/process', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, undefined, 'fragment')

  // IPv6address, example from bkw (https://github.com/garycourt/uri-js/pull/16)
  components = URI.parse('//[2606:2800:220:1:248:1893:25c8:1946]/test')
  strictEqual(components.error, undefined, 'IPv6address errors')
  strictEqual(components.scheme, undefined, 'scheme')
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, '2606:2800:220:1:248:1893:25c8:1946', 'host')
  strictEqual(components.port, undefined, 'port')
  strictEqual(components.path, '/test', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, undefined, 'fragment')

  // IPv6address, example from RFC 5952
  components = URI.parse('//[2001:db8::1]:80')
  strictEqual(components.error, undefined, 'IPv6address errors')
  strictEqual(components.scheme, undefined, 'scheme')
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, '2001:db8::1', 'host')
  strictEqual(components.port, 80, 'port')
  strictEqual(components.path, '', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, undefined, 'fragment')

  // IPv6address with zone identifier, RFC 6874
  components = URI.parse('//[fe80::a%25en1]')
  strictEqual(components.error, undefined, 'IPv4address errors')
  strictEqual(components.scheme, undefined, 'scheme')
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, 'fe80::a%en1', 'host')
  strictEqual(components.port, undefined, 'port')
  strictEqual(components.path, '', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, undefined, 'fragment')

  // IPv6address with an unescaped interface specifier, example from pekkanikander (https://github.com/garycourt/uri-js/pull/22)
  components = URI.parse('//[2001:db8::7%en0]')
  strictEqual(components.error, undefined, 'IPv6address interface errors')
  strictEqual(components.scheme, undefined, 'scheme')
  strictEqual(components.userinfo, undefined, 'userinfo')
  strictEqual(components.host, '2001:db8::7%en0', 'host')
  strictEqual(components.port, undefined, 'port')
  strictEqual(components.path, '', 'path')
  strictEqual(components.query, undefined, 'query')
  strictEqual(components.fragment, undefined, 'fragment')
})

test('URI Serialization', function () {
  let components = {
    scheme: undefined,
    userinfo: undefined,
    host: undefined,
    port: undefined,
    path: undefined,
    query: undefined,
    fragment: undefined
  }
  strictEqual(URI.serialize(components), '', 'Undefined Components')

  components = {
    scheme: '',
    userinfo: '',
    host: '',
    port: 0,
    path: '',
    query: '',
    fragment: ''
  }
  strictEqual(URI.serialize(components), '//@:0?#', 'Empty Components')

  components = {
    scheme: 'uri',
    userinfo: 'foo:bar',
    host: 'example.com',
    port: 1,
    path: 'path',
    query: 'query',
    fragment: 'fragment'
  }
  strictEqual(URI.serialize(components), 'uri://foo:bar@example.com:1/path?query#fragment', 'All Components')

  components = {
    scheme: 'uri',
    host: 'example.com',
    port: '9000'
  }
  strictEqual(URI.serialize(components), 'uri://example.com:9000', 'String port')

  strictEqual(URI.serialize({ path: '//path' }), '/%2Fpath', 'Double slash path')
  strictEqual(URI.serialize({ path: 'foo:bar' }), 'foo%3Abar', 'Colon path')
  strictEqual(URI.serialize({ path: '?query' }), '%3Fquery', 'Query path')

  // mixed IPv4address & reg-name, example from terion-name (https://github.com/garycourt/uri-js/issues/4)
  strictEqual(URI.serialize({ host: '10.10.10.10.example.com' }), '//10.10.10.10.example.com', 'Mixed IPv4address & reg-name')

  // IPv6address
  strictEqual(URI.serialize({ host: '2001:db8::7' }), '//[2001:db8::7]', 'IPv6 Host')
  strictEqual(URI.serialize({ host: '::ffff:129.144.52.38' }), '//[::ffff:129.144.52.38]', 'IPv6 Mixed Host')
  strictEqual(URI.serialize({ host: '2606:2800:220:1:248:1893:25c8:1946' }), '//[2606:2800:220:1:248:1893:25c8:1946]', 'IPv6 Full Host')

  // IPv6address with zone identifier, RFC 6874
  strictEqual(URI.serialize({ host: 'fe80::a%en1' }), '//[fe80::a%25en1]', 'IPv6 Zone Unescaped Host')
  strictEqual(URI.serialize({ host: 'fe80::a%25en1' }), '//[fe80::a%25en1]', 'IPv6 Zone Escaped Host')
})

test('URI Resolving', { skip: true }, function () {
  // normal examples from RFC 3986
  const base = 'uri://a/b/c/d;p?q'
  strictEqual(URI.resolve(base, 'g:h'), 'g:h', 'g:h')
  strictEqual(URI.resolve(base, 'g:h'), 'g:h', 'g:h')
  strictEqual(URI.resolve(base, 'g'), 'uri://a/b/c/g', 'g')
  strictEqual(URI.resolve(base, './g'), 'uri://a/b/c/g', './g')
  strictEqual(URI.resolve(base, 'g/'), 'uri://a/b/c/g/', 'g/')
  strictEqual(URI.resolve(base, '/g'), 'uri://a/g', '/g')
  strictEqual(URI.resolve(base, '//g'), 'uri://g', '//g')
  strictEqual(URI.resolve(base, '?y'), 'uri://a/b/c/d;p?y', '?y')
  strictEqual(URI.resolve(base, 'g?y'), 'uri://a/b/c/g?y', 'g?y')
  strictEqual(URI.resolve(base, '#s'), 'uri://a/b/c/d;p?q#s', '#s')
  strictEqual(URI.resolve(base, 'g#s'), 'uri://a/b/c/g#s', 'g#s')
  strictEqual(URI.resolve(base, 'g?y#s'), 'uri://a/b/c/g?y#s', 'g?y#s')
  strictEqual(URI.resolve(base, ';x'), 'uri://a/b/c/;x', ';x')
  strictEqual(URI.resolve(base, 'g;x'), 'uri://a/b/c/g;x', 'g;x')
  strictEqual(URI.resolve(base, 'g;x?y#s'), 'uri://a/b/c/g;x?y#s', 'g;x?y#s')
  strictEqual(URI.resolve(base, ''), 'uri://a/b/c/d;p?q', '')
  strictEqual(URI.resolve(base, '.'), 'uri://a/b/c/', '.')
  strictEqual(URI.resolve(base, './'), 'uri://a/b/c/', './')
  strictEqual(URI.resolve(base, '..'), 'uri://a/b/', '..')
  strictEqual(URI.resolve(base, '../'), 'uri://a/b/', '../')
  strictEqual(URI.resolve(base, '../g'), 'uri://a/b/g', '../g')
  strictEqual(URI.resolve(base, '../..'), 'uri://a/', '../..')
  strictEqual(URI.resolve(base, '../../'), 'uri://a/', '../../')
  strictEqual(URI.resolve(base, '../../g'), 'uri://a/g', '../../g')

  // abnormal examples from RFC 3986
  strictEqual(URI.resolve(base, '../../../g'), 'uri://a/g', '../../../g')
  strictEqual(URI.resolve(base, '../../../../g'), 'uri://a/g', '../../../../g')

  strictEqual(URI.resolve(base, '/./g'), 'uri://a/g', '/./g')
  strictEqual(URI.resolve(base, '/../g'), 'uri://a/g', '/../g')
  strictEqual(URI.resolve(base, 'g.'), 'uri://a/b/c/g.', 'g.')
  strictEqual(URI.resolve(base, '.g'), 'uri://a/b/c/.g', '.g')
  strictEqual(URI.resolve(base, 'g..'), 'uri://a/b/c/g..', 'g..')
  strictEqual(URI.resolve(base, '..g'), 'uri://a/b/c/..g', '..g')

  strictEqual(URI.resolve(base, './../g'), 'uri://a/b/g', './../g')
  strictEqual(URI.resolve(base, './g/.'), 'uri://a/b/c/g/', './g/.')
  strictEqual(URI.resolve(base, 'g/./h'), 'uri://a/b/c/g/h', 'g/./h')
  strictEqual(URI.resolve(base, 'g/../h'), 'uri://a/b/c/h', 'g/../h')
  strictEqual(URI.resolve(base, 'g;x=1/./y'), 'uri://a/b/c/g;x=1/y', 'g;x=1/./y')
  strictEqual(URI.resolve(base, 'g;x=1/../y'), 'uri://a/b/c/y', 'g;x=1/../y')

  strictEqual(URI.resolve(base, 'g?y/./x'), 'uri://a/b/c/g?y/./x', 'g?y/./x')
  strictEqual(URI.resolve(base, 'g?y/../x'), 'uri://a/b/c/g?y/../x', 'g?y/../x')
  strictEqual(URI.resolve(base, 'g#s/./x'), 'uri://a/b/c/g#s/./x', 'g#s/./x')
  strictEqual(URI.resolve(base, 'g#s/../x'), 'uri://a/b/c/g#s/../x', 'g#s/../x')

  strictEqual(URI.resolve(base, 'uri:g'), 'uri:g', 'uri:g')
  strictEqual(URI.resolve(base, 'uri:g', { tolerant: true }), 'uri://a/b/c/g', 'uri:g')

  // examples by PAEz
  strictEqual(URI.resolve('//www.g.com/', '/adf\ngf'), '//www.g.com/adf%0Agf', '/adf\\ngf')
  strictEqual(URI.resolve('//www.g.com/error\n/bleh/bleh', '..'), '//www.g.com/error%0A/', '//www.g.com/error\\n/bleh/bleh')
})

test('URI Normalizing', { skip: true }, function () {
  // test from RFC 3987
  strictEqual(URI.normalize('uri://www.example.org/red%09ros\xE9#red'), 'uri://www.example.org/red%09ros%C3%A9#red')

  // IPv4address
  strictEqual(URI.normalize('//192.068.001.000'), '//192.68.1.0')

  // IPv6address, example from RFC 3513
  strictEqual(URI.normalize('http://[1080::8:800:200C:417A]/'), 'http://[1080::8:800:200c:417a]/')

  // IPv6address, examples from RFC 5952
  strictEqual(URI.normalize('//[2001:0db8::0001]/'), '//[2001:db8::1]/')
  strictEqual(URI.normalize('//[2001:db8::1:0000:1]/'), '//[2001:db8::1:0:1]/')
  strictEqual(URI.normalize('//[2001:db8:0:0:0:0:2:1]/'), '//[2001:db8::2:1]/')
  strictEqual(URI.normalize('//[2001:db8:0:1:1:1:1:1]/'), '//[2001:db8:0:1:1:1:1:1]/')
  strictEqual(URI.normalize('//[2001:0:0:1:0:0:0:1]/'), '//[2001:0:0:1::1]/')
  strictEqual(URI.normalize('//[2001:db8:0:0:1:0:0:1]/'), '//[2001:db8::1:0:0:1]/')
  strictEqual(URI.normalize('//[2001:DB8::1]/'), '//[2001:db8::1]/')
  strictEqual(URI.normalize('//[0:0:0:0:0:ffff:192.0.2.1]/'), '//[::ffff:192.0.2.1]/')

  // Mixed IPv4 and IPv6 address
  strictEqual(URI.normalize('//[1:2:3:4:5:6:192.0.2.1]/'), '//[1:2:3:4:5:6:192.0.2.1]/')
  strictEqual(URI.normalize('//[1:2:3:4:5:6:192.068.001.000]/'), '//[1:2:3:4:5:6:192.68.1.0]/')
})

test('URI Equals', function () {
  // test from RFC 3986
  strictEqual(URI.equal('example://a/b/c/%7Bfoo%7D', 'eXAMPLE://a/./b/../b/%63/%7bfoo%7d'), true)

  // test from RFC 3987
  strictEqual(URI.equal('http://example.org/~user', 'http://example.org/%7euser'), true)
})

test('Escape Component', { skip: true }, function () {
  let chr
  for (let d = 0; d <= 129; ++d) {
    chr = String.fromCharCode(d)
    if (!chr.match(/[$&+,;=]/)) {
      strictEqual(URI.escapeComponent(chr), encodeURIComponent(chr))
    } else {
      strictEqual(URI.escapeComponent(chr), chr)
    }
  }
  strictEqual(URI.escapeComponent('\u00c0'), encodeURIComponent('\u00c0'))
  strictEqual(URI.escapeComponent('\u07ff'), encodeURIComponent('\u07ff'))
  strictEqual(URI.escapeComponent('\u0800'), encodeURIComponent('\u0800'))
  strictEqual(URI.escapeComponent('\u30a2'), encodeURIComponent('\u30a2'))
})

test('Unescape Component', { skip: true }, function () {
  let chr
  for (let d = 0; d <= 129; ++d) {
    chr = String.fromCharCode(d)
    strictEqual(URI.unescapeComponent(encodeURIComponent(chr)), chr)
  }
  strictEqual(URI.unescapeComponent(encodeURIComponent('\u00c0')), '\u00c0')
  strictEqual(URI.unescapeComponent(encodeURIComponent('\u07ff')), '\u07ff')
  strictEqual(URI.unescapeComponent(encodeURIComponent('\u0800')), '\u0800')
  strictEqual(URI.unescapeComponent(encodeURIComponent('\u30a2')), '\u30a2')
})

//
// IRI
//

const IRI_OPTION = { iri: true, unicodeSupport: true }

test('IRI Parsing', { skip: true }, function () {
  const components = URI.parse('uri://us\xA0er:pa\uD7FFss@example.com:123/o\uF900ne/t\uFDCFwo.t\uFDF0hree?q1=a1\uF8FF\uE000&q2=a2#bo\uFFEFdy', IRI_OPTION)
  strictEqual(components.error, undefined, 'all errors')
  strictEqual(components.scheme, 'uri', 'scheme')
  // strictEqual(components.authority, "us\xA0er:pa\uD7FFss@example.com:123", "authority");
  strictEqual(components.userinfo, 'us\xA0er:pa\uD7FFss', 'userinfo')
  strictEqual(components.host, 'example.com', 'host')
  strictEqual(components.port, 123, 'port')
  strictEqual(components.path, '/o\uF900ne/t\uFDCFwo.t\uFDF0hree', 'path')
  strictEqual(components.query, 'q1=a1\uF8FF\uE000&q2=a2', 'query')
  strictEqual(components.fragment, 'bo\uFFEFdy', 'fragment')
})

test('IRI Serialization', { skip: true }, function () {
  const components = {
    scheme: 'uri',
    userinfo: 'us\xA0er:pa\uD7FFss',
    host: 'example.com',
    port: 123,
    path: '/o\uF900ne/t\uFDCFwo.t\uFDF0hree',
    query: 'q1=a1\uF8FF\uE000&q2=a2',
    fragment: 'bo\uFFEFdy\uE001'
  }
  strictEqual(URI.serialize(components, IRI_OPTION), 'uri://us\xA0er:pa\uD7FFss@example.com:123/o\uF900ne/t\uFDCFwo.t\uFDF0hree?q1=a1\uF8FF\uE000&q2=a2#bo\uFFEFdy%EE%80%81')
})

test('IRI Normalizing', { skip: true }, function () {
  strictEqual(URI.normalize('uri://www.example.org/red%09ros\xE9#red', IRI_OPTION), 'uri://www.example.org/red%09ros\xE9#red')
})

test('IRI Equals', { skip: true }, function () {
  // example from RFC 3987
  strictEqual(URI.equal('example://a/b/c/%7Bfoo%7D/ros\xE9', 'eXAMPLE://a/./b/../b/%63/%7bfoo%7d/ros%C3%A9', IRI_OPTION), true)
})

test('Convert IRI to URI', { skip: true }, function () {
  // example from RFC 3987
  strictEqual(URI.serialize(URI.parse('uri://www.example.org/red%09ros\xE9#red', IRI_OPTION)), 'uri://www.example.org/red%09ros%C3%A9#red')

  // Internationalized Domain Name conversion via punycode example from RFC 3987
  strictEqual(URI.serialize(URI.parse('uri://r\xE9sum\xE9.example.org', { iri: true, domainHost: true }), { domainHost: true }), 'uri://xn--rsum-bpad.example.org')
})

test('Convert URI to IRI', { skip: true }, function () {
  // examples from RFC 3987
  strictEqual(URI.serialize(URI.parse('uri://www.example.org/D%C3%BCrst'), IRI_OPTION), 'uri://www.example.org/D\xFCrst')
  strictEqual(URI.serialize(URI.parse('uri://www.example.org/D%FCrst'), IRI_OPTION), 'uri://www.example.org/D%FCrst')
  strictEqual(URI.serialize(URI.parse('uri://xn--99zt52a.example.org/%e2%80%ae'), IRI_OPTION), 'uri://xn--99zt52a.example.org/%E2%80%AE') // or uri://\u7D0D\u8C46.example.org/%E2%80%AE

  // Internationalized Domain Name conversion via punycode example from RFC 3987
  strictEqual(URI.serialize(URI.parse('uri://xn--rsum-bpad.example.org', { domainHost: true }), { iri: true, domainHost: true }), 'uri://r\xE9sum\xE9.example.org')
})

//
// HTTP
//

if (URI.SCHEMES.http) {
  // module("HTTP");

  test('HTTP Equals', function () {
    // test from RFC 2616
    strictEqual(URI.equal('http://abc.com:80/~smith/home.html', 'http://abc.com/~smith/home.html'), true)
    strictEqual(URI.equal('http://ABC.com/%7Esmith/home.html', 'http://abc.com/~smith/home.html'), true)
    strictEqual(URI.equal('http://ABC.com:/%7esmith/home.html', 'http://abc.com/~smith/home.html'), true)
    strictEqual(URI.equal('HTTP://ABC.COM', 'http://abc.com/'), true)
    // test from RFC 3986
    strictEqual(URI.equal('http://example.com:/', 'http://example.com:80/'), true)
  })
}

if (URI.SCHEMES.https) {
  // module("HTTPS");

  test('HTTPS Equals', function () {
    strictEqual(URI.equal('https://example.com', 'https://example.com:443/'), true)
    strictEqual(URI.equal('https://example.com:/', 'https://example.com:443/'), true)
  })
}

//
// URN
//

if (URI.SCHEMES.urn) {
  // module("URN");

  test('URN Parsing', function () {
    // example from RFC 2141
    const components = URI.parse('urn:foo:a123,456')
    strictEqual(components.error, undefined, 'errors')
    strictEqual(components.scheme, 'urn', 'scheme')
    // strictEqual(components.authority, undefined, "authority");
    strictEqual(components.userinfo, undefined, 'userinfo')
    strictEqual(components.host, undefined, 'host')
    strictEqual(components.port, undefined, 'port')
    strictEqual(components.path, undefined, 'path')
    strictEqual(components.query, undefined, 'query')
    strictEqual(components.fragment, undefined, 'fragment')
    strictEqual(components.nid, 'foo', 'nid')
    strictEqual(components.nss, 'a123,456', 'nss')
  })

  test('URN Serialization', function () {
    // example from RFC 2141
    const components = {
      scheme: 'urn',
      nid: 'foo',
      nss: 'a123,456'
    }
    strictEqual(URI.serialize(components), 'urn:foo:a123,456')
  })

  test('URN Equals', { skip: true }, function () {
    // test from RFC 2141
    strictEqual(URI.equal('urn:foo:a123,456', 'urn:foo:a123,456'), true)
    strictEqual(URI.equal('urn:foo:a123,456', 'URN:foo:a123,456'), true)
    strictEqual(URI.equal('urn:foo:a123,456', 'urn:FOO:a123,456'), true)
    strictEqual(URI.equal('urn:foo:a123,456', 'urn:foo:A123,456'), false)
    strictEqual(URI.equal('urn:foo:a123%2C456', 'URN:FOO:a123%2c456'), true)
  })

  test('URN Resolving', function () {
    // example from epoberezkin
    strictEqual(URI.resolve('', 'urn:some:ip:prop'), 'urn:some:ip:prop')
    strictEqual(URI.resolve('#', 'urn:some:ip:prop'), 'urn:some:ip:prop')
    strictEqual(URI.resolve('urn:some:ip:prop', 'urn:some:ip:prop'), 'urn:some:ip:prop')
    strictEqual(URI.resolve('urn:some:other:prop', 'urn:some:ip:prop'), 'urn:some:ip:prop')
  })

  //
  // URN UUID
  //

  test('UUID Parsing', function () {
    // example from RFC 4122
    let components = URI.parse('urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6')
    strictEqual(components.error, undefined, 'errors')
    strictEqual(components.scheme, 'urn', 'scheme')
    // strictEqual(components.authority, undefined, "authority");
    strictEqual(components.userinfo, undefined, 'userinfo')
    strictEqual(components.host, undefined, 'host')
    strictEqual(components.port, undefined, 'port')
    strictEqual(components.path, undefined, 'path')
    strictEqual(components.query, undefined, 'query')
    strictEqual(components.fragment, undefined, 'fragment')
    strictEqual(components.nid, 'uuid', 'nid')
    strictEqual(components.nss, undefined, 'nss')
    strictEqual(components.uuid, 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6', 'uuid')

    components = URI.parse('urn:uuid:notauuid-7dec-11d0-a765-00a0c91e6bf6')
    notStrictEqual(components.error, undefined, 'errors')
  })

  test('UUID Serialization', function () {
    // example from RFC 4122
    let components = {
      scheme: 'urn',
      nid: 'uuid',
      uuid: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6'
    }
    strictEqual(URI.serialize(components), 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6')

    components = {
      scheme: 'urn',
      nid: 'uuid',
      uuid: 'notauuid-7dec-11d0-a765-00a0c91e6bf6'
    }
    strictEqual(URI.serialize(components), 'urn:uuid:notauuid-7dec-11d0-a765-00a0c91e6bf6')
  })

  test('UUID Equals', function () {
    strictEqual(URI.equal('URN:UUID:F81D4FAE-7DEC-11D0-A765-00A0C91E6BF6', 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6'), true)
  })

  test('URN NID Override', function () {
    let components = URI.parse('urn:foo:f81d4fae-7dec-11d0-a765-00a0c91e6bf6', { nid: 'uuid' })
    strictEqual(components.error, undefined, 'errors')
    strictEqual(components.scheme, 'urn', 'scheme')
    strictEqual(components.path, undefined, 'path')
    strictEqual(components.nid, 'foo', 'nid')
    strictEqual(components.nss, undefined, 'nss')
    strictEqual(components.uuid, 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6', 'uuid')

    components = {
      scheme: 'urn',
      nid: 'foo',
      uuid: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6'
    }
    strictEqual(URI.serialize(components, { nid: 'uuid' }), 'urn:foo:f81d4fae-7dec-11d0-a765-00a0c91e6bf6')
  })
}

//
// Mailto
//

if (URI.SCHEMES.mailto) {
  // module("Mailto");

  test('Mailto Parse', function () {
    let components

    // tests from RFC 6068

    components = URI.parse('mailto:chris@example.com')
    strictEqual(components.error, undefined, 'error')
    strictEqual(components.scheme, 'mailto', 'scheme')
    strictEqual(components.userinfo, undefined, 'userinfo')
    strictEqual(components.host, undefined, 'host')
    strictEqual(components.port, undefined, 'port')
    strictEqual(components.path, undefined, 'path')
    strictEqual(components.query, undefined, 'query')
    strictEqual(components.fragment, undefined, 'fragment')
    deepEqual(components.to, ['chris@example.com'], 'to')
    strictEqual(components.subject, undefined, 'subject')
    strictEqual(components.body, undefined, 'body')
    strictEqual(components.headers, undefined, 'headers')

    components = URI.parse('mailto:infobot@example.com?subject=current-issue')
    deepEqual(components.to, ['infobot@example.com'], 'to')
    strictEqual(components.subject, 'current-issue', 'subject')

    components = URI.parse('mailto:infobot@example.com?body=send%20current-issue')
    deepEqual(components.to, ['infobot@example.com'], 'to')
    strictEqual(components.body, 'send current-issue', 'body')

    components = URI.parse('mailto:infobot@example.com?body=send%20current-issue%0D%0Asend%20index')
    deepEqual(components.to, ['infobot@example.com'], 'to')
    strictEqual(components.body, 'send current-issue\x0D\x0Asend index', 'body')

    components = URI.parse('mailto:list@example.org?In-Reply-To=%3C3469A91.D10AF4C@example.com%3E')
    deepEqual(components.to, ['list@example.org'], 'to')
    deepEqual(components.headers, { 'In-Reply-To': '<3469A91.D10AF4C@example.com>' }, 'headers')

    components = URI.parse('mailto:majordomo@example.com?body=subscribe%20bamboo-l')
    deepEqual(components.to, ['majordomo@example.com'], 'to')
    strictEqual(components.body, 'subscribe bamboo-l', 'body')

    components = URI.parse('mailto:joe@example.com?cc=bob@example.com&body=hello')
    deepEqual(components.to, ['joe@example.com'], 'to')
    strictEqual(components.body, 'hello', 'body')
    deepEqual(components.headers, { cc: 'bob@example.com' }, 'headers')

    components = URI.parse('mailto:joe@example.com?cc=bob@example.com?body=hello')
    if (URI.VALIDATE_SUPPORT) ok(components.error, 'invalid header fields')

    components = URI.parse('mailto:gorby%25kremvax@example.com')
    deepEqual(components.to, ['gorby%kremvax@example.com'], 'to gorby%kremvax@example.com')

    components = URI.parse('mailto:unlikely%3Faddress@example.com?blat=foop')
    deepEqual(components.to, ['unlikely?address@example.com'], 'to unlikely?address@example.com')
    deepEqual(components.headers, { blat: 'foop' }, 'headers')

    components = URI.parse('mailto:Mike%26family@example.org')
    deepEqual(components.to, ['Mike&family@example.org'], 'to Mike&family@example.org')

    components = URI.parse('mailto:%22not%40me%22@example.org')
    deepEqual(components.to, ['"not@me"@example.org'], 'to ' + '"not@me"@example.org')

    components = URI.parse('mailto:%22oh%5C%5Cno%22@example.org')
    deepEqual(components.to, ['"oh\\\\no"@example.org'], 'to ' + '"oh\\\\no"@example.org')

    components = URI.parse("mailto:%22%5C%5C%5C%22it's%5C%20ugly%5C%5C%5C%22%22@example.org")
    deepEqual(components.to, ['"\\\\\\"it\'s\\ ugly\\\\\\""@example.org'], 'to ' + '"\\\\\\"it\'s\\ ugly\\\\\\""@example.org')

    components = URI.parse('mailto:user@example.org?subject=caf%C3%A9')
    deepEqual(components.to, ['user@example.org'], 'to')
    strictEqual(components.subject, 'caf\xE9', 'subject')

    components = URI.parse('mailto:user@example.org?subject=%3D%3Futf-8%3FQ%3Fcaf%3DC3%3DA9%3F%3D')
    deepEqual(components.to, ['user@example.org'], 'to')
    strictEqual(components.subject, '=?utf-8?Q?caf=C3=A9?=', 'subject') // TODO: Verify this

    components = URI.parse('mailto:user@example.org?subject=%3D%3Fiso-8859-1%3FQ%3Fcaf%3DE9%3F%3D')
    deepEqual(components.to, ['user@example.org'], 'to')
    strictEqual(components.subject, '=?iso-8859-1?Q?caf=E9?=', 'subject') // TODO: Verify this

    components = URI.parse('mailto:user@example.org?subject=caf%C3%A9&body=caf%C3%A9')
    deepEqual(components.to, ['user@example.org'], 'to')
    strictEqual(components.subject, 'caf\xE9', 'subject')
    strictEqual(components.body, 'caf\xE9', 'body')

    if (URI.IRI_SUPPORT) {
      components = URI.parse('mailto:user@%E7%B4%8D%E8%B1%86.example.org?subject=Test&body=NATTO')
      deepEqual(components.to, ['user@xn--99zt52a.example.org'], 'to')
      strictEqual(components.subject, 'Test', 'subject')
      strictEqual(components.body, 'NATTO', 'body')
    }
  })

  test('Mailto Serialize', function () {
    // tests from RFC 6068
    strictEqual(URI.serialize({ scheme: 'mailto', to: ['chris@example.com'] }), 'mailto:chris@example.com')
    strictEqual(URI.serialize({ scheme: 'mailto', to: ['infobot@example.com'], body: 'current-issue' }), 'mailto:infobot@example.com?body=current-issue')
    strictEqual(URI.serialize({ scheme: 'mailto', to: ['infobot@example.com'], body: 'send current-issue' }), 'mailto:infobot@example.com?body=send%20current-issue')
    strictEqual(URI.serialize({ scheme: 'mailto', to: ['infobot@example.com'], body: 'send current-issue\x0D\x0Asend index' }), 'mailto:infobot@example.com?body=send%20current-issue%0D%0Asend%20index')
    strictEqual(URI.serialize({ scheme: 'mailto', to: ['list@example.org'], headers: { 'In-Reply-To': '<3469A91.D10AF4C@example.com>' } }), 'mailto:list@example.org?In-Reply-To=%3C3469A91.D10AF4C@example.com%3E')
    strictEqual(URI.serialize({ scheme: 'mailto', to: ['majordomo@example.com'], body: 'subscribe bamboo-l' }), 'mailto:majordomo@example.com?body=subscribe%20bamboo-l')
    strictEqual(URI.serialize({ scheme: 'mailto', to: ['joe@example.com'], headers: { cc: 'bob@example.com', body: 'hello' } }), 'mailto:joe@example.com?cc=bob@example.com&body=hello')
    strictEqual(URI.serialize({ scheme: 'mailto', to: ['gorby%25kremvax@example.com'] }), 'mailto:gorby%25kremvax@example.com')
    strictEqual(URI.serialize({ scheme: 'mailto', to: ['unlikely%3Faddress@example.com'], headers: { blat: 'foop' } }), 'mailto:unlikely%3Faddress@example.com?blat=foop')
    strictEqual(URI.serialize({ scheme: 'mailto', to: ['Mike&family@example.org'] }), 'mailto:Mike%26family@example.org')
    strictEqual(URI.serialize({ scheme: 'mailto', to: ['"not@me"@example.org'] }), 'mailto:%22not%40me%22@example.org')
    strictEqual(URI.serialize({ scheme: 'mailto', to: ['"oh\\\\no"@example.org'] }), 'mailto:%22oh%5C%5Cno%22@example.org')
    strictEqual(URI.serialize({ scheme: 'mailto', to: ['"\\\\\\"it\'s\\ ugly\\\\\\""@example.org'] }), "mailto:%22%5C%5C%5C%22it's%5C%20ugly%5C%5C%5C%22%22@example.org")
    strictEqual(URI.serialize({ scheme: 'mailto', to: ['user@example.org'], subject: 'caf\xE9' }), 'mailto:user@example.org?subject=caf%C3%A9')
    strictEqual(URI.serialize({ scheme: 'mailto', to: ['user@example.org'], subject: '=?utf-8?Q?caf=C3=A9?=' }), 'mailto:user@example.org?subject=%3D%3Futf-8%3FQ%3Fcaf%3DC3%3DA9%3F%3D')
    strictEqual(URI.serialize({ scheme: 'mailto', to: ['user@example.org'], subject: '=?iso-8859-1?Q?caf=E9?=' }), 'mailto:user@example.org?subject=%3D%3Fiso-8859-1%3FQ%3Fcaf%3DE9%3F%3D')
    strictEqual(URI.serialize({ scheme: 'mailto', to: ['user@example.org'], subject: 'caf\xE9', body: 'caf\xE9' }), 'mailto:user@example.org?subject=caf%C3%A9&body=caf%C3%A9')
    if (URI.IRI_SUPPORT) {
      strictEqual(URI.serialize({ scheme: 'mailto', to: ['us\xE9r@\u7d0d\u8c46.example.org'], subject: 'Test', body: 'NATTO' }), 'mailto:us%C3%A9r@xn--99zt52a.example.org?subject=Test&body=NATTO')
    }
  })

  test('Mailto Equals', function () {
    // tests from RFC 6068
    strictEqual(URI.equal('mailto:addr1@an.example,addr2@an.example', 'mailto:?to=addr1@an.example,addr2@an.example'), true)
    strictEqual(URI.equal('mailto:?to=addr1@an.example,addr2@an.example', 'mailto:addr1@an.example?to=addr2@an.example'), true)
  })
}

if (URI.SCHEMES.ws) {
  // module("WS");

  test('WS Parse', function () {
    let components

    // example from RFC 6455, Sec 4.1
    components = URI.parse('ws://example.com/chat')
    strictEqual(components.error, undefined, 'error')
    strictEqual(components.scheme, 'ws', 'scheme')
    strictEqual(components.userinfo, undefined, 'userinfo')
    strictEqual(components.host, 'example.com', 'host')
    strictEqual(components.port, undefined, 'port')
    strictEqual(components.path, undefined, 'path')
    strictEqual(components.query, undefined, 'query')
    strictEqual(components.fragment, undefined, 'fragment')
    strictEqual(components.resourceName, '/chat', 'resourceName')
    strictEqual(components.secure, false, 'secure')

    components = URI.parse('ws://example.com/foo?bar=baz')
    strictEqual(components.error, undefined, 'error')
    strictEqual(components.scheme, 'ws', 'scheme')
    strictEqual(components.userinfo, undefined, 'userinfo')
    strictEqual(components.host, 'example.com', 'host')
    strictEqual(components.port, undefined, 'port')
    strictEqual(components.path, undefined, 'path')
    strictEqual(components.query, undefined, 'query')
    strictEqual(components.fragment, undefined, 'fragment')
    strictEqual(components.resourceName, '/foo?bar=baz', 'resourceName')
    strictEqual(components.secure, false, 'secure')

    components = URI.parse('ws://example.com/?bar=baz')
    strictEqual(components.resourceName, '/?bar=baz', 'resourceName')
  })

  test('WS Serialize', function () {
    strictEqual(URI.serialize({ scheme: 'ws' }), 'ws:')
    strictEqual(URI.serialize({ scheme: 'ws', host: 'example.com' }), 'ws://example.com')
    strictEqual(URI.serialize({ scheme: 'ws', resourceName: '/' }), 'ws:')
    strictEqual(URI.serialize({ scheme: 'ws', resourceName: '/foo' }), 'ws:/foo')
    strictEqual(URI.serialize({ scheme: 'ws', resourceName: '/foo?bar' }), 'ws:/foo?bar')
    strictEqual(URI.serialize({ scheme: 'ws', secure: false }), 'ws:')
    strictEqual(URI.serialize({ scheme: 'ws', secure: true }), 'wss:')
    strictEqual(URI.serialize({ scheme: 'ws', host: 'example.com', resourceName: '/foo' }), 'ws://example.com/foo')
    strictEqual(URI.serialize({ scheme: 'ws', host: 'example.com', resourceName: '/foo?bar' }), 'ws://example.com/foo?bar')
    strictEqual(URI.serialize({ scheme: 'ws', host: 'example.com', secure: false }), 'ws://example.com')
    strictEqual(URI.serialize({ scheme: 'ws', host: 'example.com', secure: true }), 'wss://example.com')
    strictEqual(URI.serialize({ scheme: 'ws', host: 'example.com', resourceName: '/foo?bar', secure: false }), 'ws://example.com/foo?bar')
    strictEqual(URI.serialize({ scheme: 'ws', host: 'example.com', resourceName: '/foo?bar', secure: true }), 'wss://example.com/foo?bar')
  })

  test('WS Equal', function () {
    strictEqual(URI.equal('WS://ABC.COM:80/chat#one', 'ws://abc.com/chat'), true)
  })

  test('WS Normalize', function () {
    strictEqual(URI.normalize('ws://example.com:80/foo#hash'), 'ws://example.com/foo')
  })
}

if (URI.SCHEMES.wss) {
  // module("WSS");

  test('WSS Parse', function () {
    let components

    // example from RFC 6455, Sec 4.1
    components = URI.parse('wss://example.com/chat')
    strictEqual(components.error, undefined, 'error')
    strictEqual(components.scheme, 'wss', 'scheme')
    strictEqual(components.userinfo, undefined, 'userinfo')
    strictEqual(components.host, 'example.com', 'host')
    strictEqual(components.port, undefined, 'port')
    strictEqual(components.path, undefined, 'path')
    strictEqual(components.query, undefined, 'query')
    strictEqual(components.fragment, undefined, 'fragment')
    strictEqual(components.resourceName, '/chat', 'resourceName')
    strictEqual(components.secure, true, 'secure')

    components = URI.parse('wss://example.com/foo?bar=baz')
    strictEqual(components.error, undefined, 'error')
    strictEqual(components.scheme, 'wss', 'scheme')
    strictEqual(components.userinfo, undefined, 'userinfo')
    strictEqual(components.host, 'example.com', 'host')
    strictEqual(components.port, undefined, 'port')
    strictEqual(components.path, undefined, 'path')
    strictEqual(components.query, undefined, 'query')
    strictEqual(components.fragment, undefined, 'fragment')
    strictEqual(components.resourceName, '/foo?bar=baz', 'resourceName')
    strictEqual(components.secure, true, 'secure')

    components = URI.parse('wss://example.com/?bar=baz')
    strictEqual(components.resourceName, '/?bar=baz', 'resourceName')
  })

  test('WSS Serialize', function () {
    strictEqual(URI.serialize({ scheme: 'wss' }), 'wss:')
    strictEqual(URI.serialize({ scheme: 'wss', host: 'example.com' }), 'wss://example.com')
    strictEqual(URI.serialize({ scheme: 'wss', resourceName: '/' }), 'wss:')
    strictEqual(URI.serialize({ scheme: 'wss', resourceName: '/foo' }), 'wss:/foo')
    strictEqual(URI.serialize({ scheme: 'wss', resourceName: '/foo?bar' }), 'wss:/foo?bar')
    strictEqual(URI.serialize({ scheme: 'wss', secure: false }), 'ws:')
    strictEqual(URI.serialize({ scheme: 'wss', secure: true }), 'wss:')
    strictEqual(URI.serialize({ scheme: 'wss', host: 'example.com', resourceName: '/foo' }), 'wss://example.com/foo')
    strictEqual(URI.serialize({ scheme: 'wss', host: 'example.com', resourceName: '/foo?bar' }), 'wss://example.com/foo?bar')
    strictEqual(URI.serialize({ scheme: 'wss', host: 'example.com', secure: false }), 'ws://example.com')
    strictEqual(URI.serialize({ scheme: 'wss', host: 'example.com', secure: true }), 'wss://example.com')
    strictEqual(URI.serialize({ scheme: 'wss', host: 'example.com', resourceName: '/foo?bar', secure: false }), 'ws://example.com/foo?bar')
    strictEqual(URI.serialize({ scheme: 'wss', host: 'example.com', resourceName: '/foo?bar', secure: true }), 'wss://example.com/foo?bar')
  })

  test('WSS Equal', function () {
    strictEqual(URI.equal('WSS://ABC.COM:443/chat#one', 'wss://abc.com/chat'), true)
  })

  test('WSS Normalize', function () {
    strictEqual(URI.normalize('wss://example.com:443/foo#hash'), 'wss://example.com/foo')
  })
}
