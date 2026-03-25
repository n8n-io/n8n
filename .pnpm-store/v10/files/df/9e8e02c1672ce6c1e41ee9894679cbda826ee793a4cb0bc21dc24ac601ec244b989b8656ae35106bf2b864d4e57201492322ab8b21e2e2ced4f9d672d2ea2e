'use strict'
const fastRedact = require('..')
const redact = fastRedact({ paths: ['a[*].c.d[*]'] })
const obj = {
  a: [
    { c: { d: ['hide me', '2'], e: 'leave me be' } },
    { c: { d: ['and me'], f: 'I want to live' } },
    { c: { d: ['and also I'], g: 'I want to run in a stream' } }
  ]
}
console.log(redact(obj))
