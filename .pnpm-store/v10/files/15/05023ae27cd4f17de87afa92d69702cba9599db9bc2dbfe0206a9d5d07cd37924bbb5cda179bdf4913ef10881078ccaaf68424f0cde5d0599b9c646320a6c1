const fsx = require('./../helpers/fsx')
const path = require('path')
const picomatch = require('picomatch')

const TYPE_ENV_FILE = 'envFile'

const Errors = require('./../helpers/errors')

const {
  determine
} = require('./../helpers/envResolution')

const {
  keyNames,
  keyValues
} = require('./../helpers/keyResolution')

const {
  opsKeypair,
  localKeypair,
  encryptValue,
  decryptKeyValue,
  isEncrypted
} = require('./../helpers/cryptography')

const append = require('./../helpers/append')
const replace = require('./../helpers/replace')
const dotenvParse = require('./../helpers/dotenvParse')
const detectEncoding = require('./../helpers/detectEncoding')

class Rotate {
  constructor (envs = [], key = [], excludeKey = [], envKeysFilepath = null, opsOn = false) {
    this.envs = determine(envs, process.env)
    this.key = key
    this.excludeKey = excludeKey
    this.envKeysFilepath = envKeysFilepath
    this.opsOn = opsOn

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
      const encoding = detectEncoding(filepath)
      let envSrc = fsx.readFileX(filepath, { encoding })
      const envParsed = dotenvParse(envSrc)

      const { publicKeyName, privateKeyName } = keyNames(envFilepath)
      const { privateKeyValue } = keyValues(envFilepath, { keysFilepath: this.envKeysFilepath, opsOn: this.opsOn })

      let newPublicKey
      let newPrivateKey
      let envKeysFilepath
      let envKeysSrc

      if (this.opsOn) {
        const kp = opsKeypair()
        newPublicKey = kp.publicKey
        newPrivateKey = kp.privateKey

        row.privateKeyAdded = false // TODO: change to localPrivateKeyAdded
      } else {
        envKeysFilepath = path.join(path.dirname(filepath), '.env.keys')
        if (this.envKeysFilepath) {
          envKeysFilepath = path.resolve(this.envKeysFilepath)
        }
        row.envKeysFilepath = envKeysFilepath
        this.envKeysSources[envKeysFilepath] ||= fsx.readFileX(envKeysFilepath, { encoding: detectEncoding(envKeysFilepath) })
        envKeysSrc = this.envKeysSources[envKeysFilepath]

        const kp = localKeypair()
        newPublicKey = kp.publicKey
        newPrivateKey = kp.privateKey

        row.privateKeyAdded = true
      }

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

          const decryptedValue = decryptKeyValue(key, value, privateKeyName, privateKeyValue) // get decrypted value
          let encryptedValue
          try {
            encryptedValue = encryptValue(decryptedValue, newPublicKey) // encrypt with the new publicKey
          } catch {
            throw new Errors({ publicKeyName, publicKey: newPublicKey }).invalidPublicKey()
          }

          envSrc = replace(envSrc, key, encryptedValue)
        }
      }
      row.envSrc = envSrc
      row.privateKeyName = privateKeyName
      row.privateKey = newPrivateKey

      if (!this.opsOn) {
        // keys src only for ops
        envKeysSrc = append(envKeysSrc, privateKeyName, newPrivateKey) // append privateKey
        this.envKeysSources[envKeysFilepath] = envKeysSrc
        row.envKeysSrc = envKeysSrc
      }

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
}

module.exports = Rotate
