'use strict'
const fastRedact = require('..')
const redact = fastRedact({
  paths: ['a'],
  serialize: false
})
const o = { a: 1, b: 2 }
console.log(redact(o) === o)
console.log(o)
console.log(redact.restore(o) === o)
console.log(o)
