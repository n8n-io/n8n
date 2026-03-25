const fsx = require('./../helpers/fsx')
const path = require('path')
const picomatch = require('picomatch')

const TYPE_ENV_FILE = 'envFile'

const Errors = require('./../helpers/errors')
const guessPrivateKeyName = require('./../helpers/guessPrivateKeyName')
const { findPrivateKey } = require('./../helpers/findPrivateKey')
const findPublicKey = require('./../helpers/findPublicKey')
const decryptKeyValue = require('./../helpers/decryptKeyValue')
const isEncrypted = require('./../helpers/isEncrypted')
const dotenvParse = require('./../helpers/dotenvParse')
const replace = require('./../helpers/replace')
const detectEncoding = require('./../helpers/detectEncoding')
const determineEnvs = require('./../helpers/determineEnvs')

class Decrypt {
  constructor (envs = [], key = [], excludeKey = [], envKeysFilepath = null, opsOn = true) {
    this.envs = determineEnvs(envs, process.env)
    this.key = key
    this.excludeKey = excludeKey
    this.envKeysFilepath = envKeysFilepath
    this.opsOn = opsOn

    this.processedEnvs = []
    this.changedFilepaths = new Set()
    this.unchangedFilepaths = new Set()
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
        this._decryptEnvFile(env.value)
      }
    }

    return {
      processedEnvs: this.processedEnvs,
      changedFilepaths: [...this.changedFilepaths],
      unchangedFilepaths: [...this.unchangedFilepaths]
    }
  }

  _decryptEnvFile (envFilepath) {
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

      const publicKey = findPublicKey(envFilepath)
      const privateKey = findPrivateKey(envFilepath, this.envKeysFilepath, this.opsOn, publicKey)
      const privateKeyName = guessPrivateKeyName(envFilepath)

      row.privateKey = privateKey
      row.privateKeyName = privateKeyName
      row.changed = false // track possible changes

      for (const [key, value] of Object.entries(envParsed)) {
        // key excluded - don't decrypt it
        if (this.exclude(key)) {
          continue
        }

        // key effectively excluded (by not being in the list of includes) - don't decrypt it
        if (this.keys.length > 0 && !this.include(key)) {
          continue
        }

        const encrypted = isEncrypted(value)
        if (encrypted) {
          row.keys.push(key) // track key(s)

          const decryptedValue = decryptKeyValue(key, value, privateKeyName, privateKey)
          // once newSrc is built write it out
          envSrc = replace(envSrc, key, decryptedValue)

          row.changed = true // track change
        }
      }

      row.envSrc = envSrc
      if (row.changed) {
        this.changedFilepaths.add(envFilepath)
      } else {
        this.unchangedFilepaths.add(envFilepath)
      }
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

module.exports = Decrypt
