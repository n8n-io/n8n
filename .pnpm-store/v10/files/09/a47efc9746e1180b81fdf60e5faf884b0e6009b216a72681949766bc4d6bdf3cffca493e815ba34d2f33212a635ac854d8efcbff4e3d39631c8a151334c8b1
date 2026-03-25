'use strict'
const fastRedact = require('..')
const fauxRequest = {
  headers: {
    host: 'http://example.com',
    cookie: `oh oh we don't want this exposed in logs in etc.`,
    referer: `if we're cool maybe we'll even redact this`
  }
}
const redact = fastRedact({
  paths: ['headers.cookie', 'headers.referer']
})

console.log(redact(fauxRequest))
