'use strict'

const test = require('tape')
const decode = require('./')

test('decode', (t) => {
  t.test('pg <9 escape format', (t) => {
    const buffer = Buffer.from([102, 111, 111, 0, 128, 92, 255])
    t.ok(buffer.equals(decode('foo\\000\\200\\\\\\377')))
    t.end()
  })

  t.test('pg >=9 hex format', (t) => {
    t.ok(decode('\\x1234').equals(Buffer.from([0x12, 0x34])))
    t.end()
  })

  t.end()
})
