'use strict'
const fastRedact = require('..')
const redact = fastRedact({ paths: ['a'], serialize: (o) => JSON.stringify(o, 0, 2) })
console.log(redact({ a: 1, b: 2 }))
