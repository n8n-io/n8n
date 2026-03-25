const guessPublicKeyName = require('./../helpers/guessPublicKeyName')
const smartDotenvPublicKey = require('./../helpers/smartDotenvPublicKey')
const guessPrivateKeyName = require('./../helpers/guessPrivateKeyName')
const smartDotenvPrivateKey = require('./../helpers/smartDotenvPrivateKey')

class Keypair {
  constructor (envFile = '.env', envKeysFilepath = null) {
    this.envFile = envFile
    this.envKeysFilepath = envKeysFilepath
  }

  run () {
    const out = {}

    const envFilepaths = this._envFilepaths()
    for (const envFilepath of envFilepaths) {
      // public key
      const publicKeyName = guessPublicKeyName(envFilepath)
      const publicKeyValue = smartDotenvPublicKey(envFilepath)
      out[publicKeyName] = publicKeyValue

      // private key
      const privateKeyName = guessPrivateKeyName(envFilepath)
      const privateKeyValue = smartDotenvPrivateKey(envFilepath, this.envKeysFilepath)

      out[privateKeyName] = privateKeyValue
    }

    return out
  }

  _envFilepaths () {
    if (!Array.isArray(this.envFile)) {
      return [this.envFile]
    }

    return this.envFile
  }
}

module.exports = Keypair
