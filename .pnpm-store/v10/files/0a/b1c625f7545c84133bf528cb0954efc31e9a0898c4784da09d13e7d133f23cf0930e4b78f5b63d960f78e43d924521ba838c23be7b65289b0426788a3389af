const mutateSrc = require('./mutateSrc')
const mutateKeysSrc = require('./mutateKeysSrc')
const opsKeypair = require('./opsKeypair')
const localKeypair = require('./localKeypair')
const { keyNames } = require('../keyResolution')

function provision ({ envSrc, envFilepath, keysFilepath, opsOn }) {
  opsOn = opsOn === true
  const { publicKeyName, privateKeyName } = keyNames(envFilepath)

  let publicKey
  let privateKey
  let keysSrc
  let envKeysFilepath
  let privateKeyAdded = false

  if (opsOn) {
    const kp = opsKeypair()
    publicKey = kp.publicKey
    privateKey = kp.privateKey
  } else {
    const kp = localKeypair()
    publicKey = kp.publicKey
    privateKey = kp.privateKey
  }

  const mutated = mutateSrc({ envSrc, envFilepath, keysFilepath, publicKeyName, publicKeyValue: publicKey })
  envSrc = mutated.envSrc

  if (!opsOn) {
    const mutated = mutateKeysSrc({ envFilepath, keysFilepath, privateKeyName, privateKeyValue: privateKey })
    keysSrc = mutated.keysSrc
    envKeysFilepath = mutated.envKeysFilepath
    privateKeyAdded = true
  }

  return {
    envSrc,
    keysSrc,
    publicKey,
    privateKey,
    privateKeyAdded,
    envKeysFilepath
  }
}

module.exports = provision
