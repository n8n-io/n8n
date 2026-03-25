const dotenvParse = require('./dotenvParse')
const isEncrypted = require('./isEncrypted')
const isPublicKey = require('./isPublicKey')

function isFullyEncrypted (src) {
  const parsed = dotenvParse(src, false, false, true) // collect all values

  for (const [key, values] of Object.entries(parsed)) {
    // handle scenario where user mistakenly includes plaintext duplicate in .env:
    //
    // # .env
    // HELLO="World"
    // HELLO="encrypted:1234"
    //
    // key => [value1, ...]
    for (const value of values) {
      const result = isEncrypted(value) || isPublicKey(key, value)
      if (!result) {
        return false
      }
    }
  }

  return true
}

module.exports = isFullyEncrypted
