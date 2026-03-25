const normalize = require('../')
const t = require('tap')

t.test('benign array', async t => {
  const pkg = { name: 'hello', version: 'world', bin: ['./x/y', 'y/z', './a'] }
  const expect = { name: 'hello', version: 'world', bin: {
    y: 'x/y',
    z: 'y/z',
    a: 'a',
  } }
  t.strictSame(normalize(pkg), expect)
  t.strictSame(normalize(normalize(pkg)), expect, 'double sanitize ok')
})

t.test('conflicting array', async t => {
  const pkg = { name: 'hello', version: 'world', bin: ['./x/y', 'z/y', './a'] }
  const expect = { name: 'hello', version: 'world', bin: {
    y: 'z/y',
    a: 'a',
  } }
  t.strictSame(normalize(pkg), expect)
  t.strictSame(normalize(normalize(pkg)), expect, 'double sanitize ok')
})

t.test('slashy array', async t => {
  const pkg = { name: 'hello', version: 'world', bin: [ '/etc/passwd' ] }
  const expect = { name: 'hello', version: 'world', bin: { passwd: 'etc/passwd' } }
  t.strictSame(normalize(pkg), expect)
  t.strictSame(normalize(normalize(pkg)), expect, 'double sanitize ok')
})

t.test('dotty array', async t => {
  const pkg = { name: 'hello', version: 'world', bin: ['../../../../etc/passwd'] }
  const expect = { name: 'hello', version: 'world', bin: { passwd: 'etc/passwd' } }
  t.strictSame(normalize(pkg), expect)
  t.strictSame(normalize(normalize(pkg)), expect, 'double sanitize ok')
})
