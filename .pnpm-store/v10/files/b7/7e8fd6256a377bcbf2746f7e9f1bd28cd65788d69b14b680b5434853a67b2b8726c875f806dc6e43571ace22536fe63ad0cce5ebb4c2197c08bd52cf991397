'use strict'

const test = require('tap').test
const Autocannon = require('../autocannon')
const fs = require('fs')

test('parse argument', (t) => {
  t.plan(4)

  const args = Autocannon.parseArguments([
    '-H', 'X-Http-Method-Override=GET',
    '-m', 'POST',
    '-b', 'the body',
    'http://localhost/foo/bar'
  ])

  t.equal(args.url, 'http://localhost/foo/bar')
  t.strictSame(args.headers, { 'X-Http-Method-Override': 'GET' })
  t.equal(args.method, 'POST')
  t.equal(args.body, 'the body')
})

test('parse argument with multiple headers', (t) => {
  t.plan(3)

  const args = Autocannon.parseArguments([
    '-H', 'header1=value1',
    '-H', 'header2=value2',
    '-H', 'header3=value3',
    '-H', 'header4=value4',
    '-H', 'header5=value5',
    'http://localhost/foo/bar'
  ])

  t.equal(args.url, 'http://localhost/foo/bar')
  t.strictSame(args.headers, {
    header1: 'value1',
    header2: 'value2',
    header3: 'value3',
    header4: 'value4',
    header5: 'value5'
  })
  t.equal(args.method, 'GET')
})

test('parse argument with multiple complex headers', (t) => {
  t.plan(3)

  const args = Autocannon.parseArguments([
    '-H', 'header1=value1;data=asd',
    '-H', 'header2=value2;data=asd',
    '-H', 'header3=value3;data=asd',
    '-H', 'header4=value4;data=asd',
    '-H', 'header5=value5;data=asd',
    'http://localhost/foo/bar'
  ])

  t.equal(args.url, 'http://localhost/foo/bar')
  t.strictSame(args.headers, {
    header1: 'value1;data=asd',
    header2: 'value2;data=asd',
    header3: 'value3;data=asd',
    header4: 'value4;data=asd',
    header5: 'value5;data=asd'
  })
  t.equal(args.method, 'GET')
})

test('parse argument with multiple headers in standard notation', (t) => {
  t.plan(3)

  const args = Autocannon.parseArguments([
    '-H', 'header1: value1',
    '-H', 'header2: value2',
    '-H', 'header3: value3',
    '-H', 'header4: value4',
    '-H', 'header5: value5',
    'http://localhost/foo/bar'
  ])

  t.equal(args.url, 'http://localhost/foo/bar')
  t.strictSame(args.headers, {
    header1: ' value1',
    header2: ' value2',
    header3: ' value3',
    header4: ' value4',
    header5: ' value5'
  })
  t.equal(args.method, 'GET')
})

test('parse argument with multiple complex headers in standard notation', (t) => {
  t.plan(3)

  const args = Autocannon.parseArguments([
    '-H', 'header1:value1;data=asd',
    '-H', 'header2:value2;data=asd',
    '-H', 'header3:value3;data=asd',
    '-H', 'header4:value4;data=asd',
    '-H', 'header5:value5;data=asd',
    'http://localhost/foo/bar'
  ])

  t.equal(args.url, 'http://localhost/foo/bar')
  t.strictSame(args.headers, {
    header1: 'value1;data=asd',
    header2: 'value2;data=asd',
    header3: 'value3;data=asd',
    header4: 'value4;data=asd',
    header5: 'value5;data=asd'
  })
  t.equal(args.method, 'GET')
})

test('parse argument with "=" in value header', (t) => {
  t.plan(1)

  const args = Autocannon.parseArguments([
    '-H', 'header1=foo=bar',
    'http://localhost/foo/bar'
  ])

  t.strictSame(args.headers, {
    header1: 'foo=bar'
  })
})

test('parse argument ending space in value header', (t) => {
  t.plan(1)

  const args = Autocannon.parseArguments([
    '-H', 'header1=foo=bar ',
    'http://localhost/foo/bar'
  ])

  t.strictSame(args.headers, {
    header1: 'foo=bar '
  })
})

test('parse argument with ":" in value header', (t) => {
  t.plan(1)

  const args = Autocannon.parseArguments([
    '-H', 'header1=foo:bar',
    'http://localhost/foo/bar'
  ])

  t.strictSame(args.headers, {
    header1: 'foo:bar'
  })
})

test('parse argument not correctly formatted header', (t) => {
  t.plan(1)

  t.throws(() => {
    Autocannon.parseArguments([
      '-H', 'header1',
      'http://localhost/foo/bar'
    ])
  }, /An HTTP header was not correctly formatted/)
})

test('parse argument with multiple url', (t) => {
  t.plan(2)
  const args = Autocannon.parseArguments([
    'localhost/foo/bar',
    'http://localhost/baz/qux'
  ])

  t.equal(args.url[0], 'http://localhost/foo/bar')
  t.equal(args.url[1], 'http://localhost/baz/qux')
})

test('parse argument with input file and multiple workers', (t) => {
  t.plan(3)

  const inputPath = 'help.txt'
  const args = Autocannon.parseArguments([
    '-m', 'POST',
    '-w', '2',
    '-a', 10,
    '-i', inputPath,
    '-H', 'Content-Type=application/json',
    'http://localhost/foo/bar'
  ])

  t.equal(args.url, 'http://localhost/foo/bar')
  t.equal(args.method, 'POST')
  t.equal(args.body, fs.readFileSync(inputPath, 'utf8'))
})

test('parse argument with cert, key and multiple ca paths', (t) => {
  t.plan(5)

  const certPath = 'test/cert.pem'
  const keyPath = 'test/key.pem'
  const caPath1 = 'help.txt'
  const caPath2 = 'package.json'
  const args = Autocannon.parseArguments([
    '-m', 'POST',
    '--cert', certPath,
    '--key', keyPath,
    '--ca', '[', caPath1, caPath2, ']',
    'http://localhost/foo/bar'
  ])

  t.equal(args.url, 'http://localhost/foo/bar')
  t.equal(args.method, 'POST')
  t.same(args.tlsOptions.cert, fs.readFileSync(certPath))
  t.same(args.tlsOptions.key, fs.readFileSync(keyPath))
  t.same(args.tlsOptions.ca, [fs.readFileSync(caPath1), fs.readFileSync(caPath2)])
})

test('parse argument with cert, key and single ca path', (t) => {
  t.plan(5)

  const certPath = 'test/cert.pem'
  const keyPath = 'test/key.pem'
  const caPath = 'help.txt'
  const args = Autocannon.parseArguments([
    '-m', 'POST',
    '--cert', certPath,
    '--key', keyPath,
    '--ca', caPath,
    'http://localhost/foo/bar'
  ])

  t.equal(args.url, 'http://localhost/foo/bar')
  t.equal(args.method, 'POST')
  t.same(args.tlsOptions.cert, fs.readFileSync(certPath))
  t.same(args.tlsOptions.key, fs.readFileSync(keyPath))
  t.same(args.tlsOptions.ca, [fs.readFileSync(caPath)])
})
