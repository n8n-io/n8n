const { encrypt } = require('eciesjs')

const PREFIX = 'encrypted:'

function encryptValue (value, publicKey) {
  const ciphertext = encrypt(publicKey, Buffer.from(value))
  const encoded = Buffer.from(ciphertext, 'hex').toString('base64') // base64 encode ciphertext

  return `${PREFIX}${encoded}`
}

module.exports = encryptValue
