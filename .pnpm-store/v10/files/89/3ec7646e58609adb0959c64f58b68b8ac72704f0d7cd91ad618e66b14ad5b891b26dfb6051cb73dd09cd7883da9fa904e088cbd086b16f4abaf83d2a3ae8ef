const { PrivateKey } = require('eciesjs')

function keypair (existingPrivateKey) {
  let kp

  if (existingPrivateKey) {
    kp = new PrivateKey(Buffer.from(existingPrivateKey, 'hex'))
  } else {
    kp = new PrivateKey()
  }

  const publicKey = kp.publicKey.toHex()
  const privateKey = kp.secret.toString('hex')

  return {
    publicKey,
    privateKey
  }
}

module.exports = keypair
