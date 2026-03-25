// helpers
const guessPrivateKeyName = require('./guessPrivateKeyName')
const findPublicKey = require('./findPublicKey')

// services
const Keypair = require('./../services/keypair')
const Ops = require('./../services/ops')

function findPrivateKey (envFilepath, envKeysFilepath = null, opsOn = false, publicKey = null) {
  // use path/to/.env.${environment} to generate privateKeyName
  const privateKeyName = guessPrivateKeyName(envFilepath)

  if (opsOn) {
    const resolvedPublicKey = publicKey || findPublicKey(envFilepath)
    const opsPrivateKey = new Ops().keypair(resolvedPublicKey)
    if (opsPrivateKey) {
      return opsPrivateKey
    }
  }

  const keypairs = new Keypair(envFilepath, envKeysFilepath).run()
  return keypairs[privateKeyName]
}

module.exports = { findPrivateKey }
