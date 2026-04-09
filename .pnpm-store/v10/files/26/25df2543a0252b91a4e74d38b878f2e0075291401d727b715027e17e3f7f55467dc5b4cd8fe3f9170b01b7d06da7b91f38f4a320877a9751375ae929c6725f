const Errors = require('./../errors')
const mutateSrc = require('./mutateSrc')
const localKeypair = require('./localKeypair')

function provisionWithPrivateKey ({ envSrc, envFilepath, keysFilepath, privateKeyValue, publicKeyValue, publicKeyName }) {
  const { publicKey, privateKey } = localKeypair(privateKeyValue) // opsOn doesn't matter here since privateKeyValue was already discovered prior (via ops and local) and passed as privateKeyValue

  // if derivation doesn't match what's in the file (or preset in env)
  if (publicKeyValue && publicKeyValue !== publicKey) {
    throw new Errors({ publicKey, publicKeyExisting: publicKeyValue }).mispairedPrivateKey()
  }

  // scenario when encrypting a monorepo second .env file from a prior generated -fk .env.keys file
  if (!publicKeyValue) {
    const mutated = mutateSrc({ envSrc, envFilepath, keysFilepath, publicKeyName, publicKeyValue: publicKey })
    envSrc = mutated.envSrc
  }

  return {
    envSrc,
    publicKey,
    privateKey
  }
}

module.exports = provisionWithPrivateKey
