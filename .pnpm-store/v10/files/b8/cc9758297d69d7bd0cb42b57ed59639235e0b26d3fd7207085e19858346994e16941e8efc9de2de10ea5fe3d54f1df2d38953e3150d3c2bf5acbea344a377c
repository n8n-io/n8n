'use strict'

const test = require('tap').test
const Autocannon = require('../autocannon')

test('debug works', (t) => {
  t.plan(5)

  const args = Autocannon.parseArguments([
    '-H', 'X-Http-Method-Override=GET',
    '-m', 'POST',
    '-b', 'the body',
    '--debug',
    'http://localhost/foo/bar'
  ])

  t.equal(args.url, 'http://localhost/foo/bar')
  t.strictSame(args.headers, { 'X-Http-Method-Override': 'GET' })
  t.equal(args.method, 'POST')
  t.equal(args.body, 'the body')
  t.equal(args.debug, true)
})
