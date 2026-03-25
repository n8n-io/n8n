const crypto = require('crypto')

const parseEncryptionKeyFromDotenvKey = require('./parseEncryptionKeyFromDotenvKey')

const NONCE_BYTES = 12

function encrypt (raw, dotenvKey) {
  const key = parseEncryptionKeyFromDotenvKey(dotenvKey)

  // set up nonce
  const nonce = crypto.randomBytes(NONCE_BYTES)

  // set up cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce)

  // generate ciphertext
  let ciphertext = ''
  ciphertext += cipher.update(raw, 'utf8', 'hex')
  ciphertext += cipher.final('hex')
  ciphertext += cipher.getAuthTag().toString('hex')

  // prepend nonce
  ciphertext = nonce.toString('hex') + ciphertext

  // base64 encode output
  return Buffer.from(ciphertext, 'hex').toString('base64')
}

module.exports = encrypt
