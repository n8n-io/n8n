'use strict'
const fastRedact = require('..')
const redact = fastRedact({ paths: ['*.c.d'] })
const obj = {
  x: { c: { d: 'hide me', e: 'leave me be' } },
  y: { c: { d: 'and me', f: 'I want to live' } },
  z: { c: { d: 'and also I', g: 'I want to run in a stream' } }
}
console.log(redact(obj))
