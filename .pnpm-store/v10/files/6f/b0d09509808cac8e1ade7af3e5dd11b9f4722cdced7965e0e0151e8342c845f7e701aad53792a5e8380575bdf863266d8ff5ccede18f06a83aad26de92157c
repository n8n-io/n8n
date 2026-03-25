'use strict'
const fastRedact = require('..')
const redact = fastRedact({ paths: ['a[*].c.d[*].i'] })
const obj = {
  a: [
    { c: { d: [ { i: 'redact me', j: 'not me' } ], e: 'leave me be' } },
    { c: { d: [ { i: 'redact me too', j: 'not me' }, { i: 'redact me too', j: 'not me' } ], f: 'I want to live' } },
    { c: { d: [ { i: 'redact me 3', j: 'not me' } ], g: 'I want to run in a stream' } }
  ]
}
console.log(redact(obj))
