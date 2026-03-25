const normalize = require('../')
const t = require('tap')

// all of these just delete the bins, so expect the same value
const expect = { name: 'hello', version: 'world' }

t.test('no bin in object', async t => {
  const pkg = { name: 'hello', version: 'world' }
  t.strictSame(normalize(pkg), expect)
  t.strictSame(normalize(normalize(pkg)), expect, 'double sanitize ok')
})

t.test('empty string bin in object', async t => {
  const pkg = { name: 'hello', version: 'world', bin: '' }
  t.strictSame(normalize(pkg), expect)
  t.strictSame(normalize(normalize(pkg)), expect, 'double sanitize ok')
})

t.test('false bin in object', async t => {
  const pkg = { name: 'hello', version: 'world', bin: false }
  t.strictSame(normalize(pkg), expect)
  t.strictSame(normalize(normalize(pkg)), expect, 'double sanitize ok')
})

t.test('null bin in object', async t => {
  const pkg = { name: 'hello', version: 'world', bin: null }
  t.strictSame(normalize(pkg), expect)
  t.strictSame(normalize(normalize(pkg)), expect, 'double sanitize ok')
})

t.test('number bin', async t => {
  const pkg = { name: 'hello', version: 'world', bin: 42069 }
  t.strictSame(normalize(pkg), expect)
  t.strictSame(normalize(normalize(pkg)), expect, 'double sanitize ok')
})
