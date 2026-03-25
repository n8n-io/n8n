'use strict'

const test = require('tap').test
const format = require('../lib/format')

const pairs = {
  2: 2,
  '2k': 2000,
  '4k': 4042,
  '2300k': 2300000
}

Object.keys(pairs).forEach((expected) => {
  const original = pairs[expected]
  test(`format ${original} into ${expected}`, (t) => {
    t.equal(expected, format(original))
    t.end()
  })
})
