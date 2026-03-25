// helpers
const guessPublicKeyName = require('./guessPublicKeyName')

// services
const Keypair = require('./../services/keypair')

function findPublicKey (envFilepath) {
  const publicKeyName = guessPublicKeyName(envFilepath)

  const keypairs = new Keypair(envFilepath).run()

  return keypairs[publicKeyName]
}

module.exports = findPublicKey
