const fsx = require('./../helpers/fsx')
const path = require('path')
const picomatch = require('picomatch')

const TYPE_ENV_FILE = 'envFile'

const Errors = require('./../helpers/errors')
const guessPrivateKeyName = require('./../helpers/guessPrivateKeyName')
const guessPublicKeyName = require('./../helpers/guessPublicKeyName')
const encryptValue = require('./../helpers/encryptValue')
const isEncrypted = require('./../helpers/isEncrypted')
const dotenvParse = require('./../helpers/dotenvParse')
const replace = require('./../helpers/replace')
const append = require('./../helpers/append')
const detectEncoding = require('./../helpers/detectEncoding')
const determineEnvs = require('./../helpers/determineEnvs')
const { findPrivateKey } = require('./../helpers/findPrivateKey')
const findPublicKey = require('./../helpers/findPublicKey')
const decryptKeyValue = require('./../helpers/decryptKeyValue')
const keypair = require('./../helpers/keypair')

class Rotate {
  constructor (envs = [], key = [], excludeKey = [], envKeysFilepath = null) {
    this.envs = determineEnvs(envs, process.env)
    this.key = key
    this.excludeKey = excludeKey
    this.envKeysFilepath = envKeysFilepath

    this.processedEnvs = []
    this.changedFilepaths = new Set()
    this.unchangedFilepaths = new Set()

    this.envKeysSources = {}
  }

  run () {
    // example
    // envs [
    //   { type: 'envFile', value: '.env' }
    // ]

    this.keys = this._keys()
    const excludeKeys = this._excludeKeys()

    this.exclude = picomatch(excludeKeys)
    this.include = picomatch(this.keys, { ignore: excludeKeys })

    for (const env of this.envs) {
      if (env.type === TYPE_ENV_FILE) {
        this._rotateEnvFile(env.value)
      }
    }

    return {
      processedEnvs: this.processedEnvs,
      changedFilepaths: [...this.changedFilepaths],
      unchangedFilepaths: [...this.unchangedFilepaths]
    }
  }

  _rotateEnvFile (envFilepath) {
    const row = {}
    row.keys = []
    row.type = TYPE_ENV_FILE

    const filepath = path.resolve(envFilepath)
    row.filepath = filepath
    row.envFilepath = envFilepath

    try {
      const encoding = this._detectEncoding(filepath)
      let envSrc = fsx.readFileX(filepath, { encoding })
      const envParsed = dotenvParse(envSrc)

      const publicKeyName = guessPublicKeyName(envFilepath)
      const privateKeyName = guessPrivateKeyName(envFilepath)
      const existingPublicKey = findPublicKey(envFilepath)
      const existingPrivateKey = findPrivateKey(envFilepath, this.envKeysFilepath, false, existingPublicKey)

      let envKeysFilepath = path.join(path.dirname(filepath), '.env.keys')
      if (this.envKeysFilepath) {
        envKeysFilepath = path.resolve(this.envKeysFilepath)
      }
      const keysEncoding = this._detectEncoding(envKeysFilepath)

      row.envKeysFilepath = envKeysFilepath
      this.envKeysSources[envKeysFilepath] ||= fsx.readFileX(envKeysFilepath, { encoding: keysEncoding })
      let envKeysSrc = this.envKeysSources[envKeysFilepath]

      // new keypair
      const nkp = keypair() // generates a fresh keypair in memory
      const newPublicKey = nkp.publicKey
      const newPrivateKey = nkp.privateKey

      // .env
      envSrc = replace(envSrc, publicKeyName, newPublicKey) // replace publicKey
      row.changed = true // track change
      for (const [key, value] of Object.entries(envParsed)) { // re-encrypt each individual key
        // key excluded - don't re-encrypt it
        if (this.exclude(key)) {
          continue
        }

        // key effectively excluded (by not being in the list of includes) - don't re-encrypt it
        if (this.keys.length > 0 && !this.include(key)) {
          continue
        }

        if (isEncrypted(value)) { // only re-encrypt those already encrypted
          row.keys.push(key) // track key(s)

          const decryptedValue = decryptKeyValue(key, value, privateKeyName, existingPrivateKey) // get decrypted value

          const encryptedValue = encryptValue(decryptedValue, newPublicKey) // encrypt with the new publicKey

          envSrc = replace(envSrc, key, encryptedValue)
        }
      }
      row.envSrc = envSrc

      // .env.keys - TODO: for dotenvx pro .env.keys file does not exist
      row.privateKeyAdded = true
      row.privateKeyName = privateKeyName
      row.privateKey = newPrivateKey
      envKeysSrc = append(envKeysSrc, privateKeyName, newPrivateKey) // append privateKey
      this.envKeysSources[envKeysFilepath] = envKeysSrc
      row.envKeysSrc = envKeysSrc

      this.changedFilepaths.add(envFilepath)
    } catch (e) {
      if (e.code === 'ENOENT') {
        row.error = new Errors({ envFilepath, filepath }).missingEnvFile()
      } else {
        row.error = e
      }
    }

    this.processedEnvs.push(row)
  }

  _keys () {
    if (!Array.isArray(this.key)) {
      return [this.key]
    }

    return this.key
  }

  _excludeKeys () {
    if (!Array.isArray(this.excludeKey)) {
      return [this.excludeKey]
    }

    return this.excludeKey
  }

  _detectEncoding (filepath) {
    return detectEncoding(filepath)
  }
}

module.exports = Rotate
