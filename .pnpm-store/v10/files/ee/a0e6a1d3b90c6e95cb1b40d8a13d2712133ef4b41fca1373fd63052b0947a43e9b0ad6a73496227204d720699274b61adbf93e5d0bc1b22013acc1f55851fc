const fsx = require('./../helpers/fsx')
const path = require('path')

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
  encryptValue,
  decryptKeyValue,
  isEncrypted,
  provision,
  provisionWithPrivateKey
} = require('./../helpers/cryptography')

const replace = require('./../helpers/replace')
const dotenvParse = require('./../helpers/dotenvParse')
const detectEncoding = require('./../helpers/detectEncoding')

class Sets {
  constructor (key, value, envs = [], encrypt = true, envKeysFilepath = null, opsOn = false) {
    this.envs = determine(envs, process.env)
    this.key = key
    this.value = value
    this.encrypt = encrypt
    this.envKeysFilepath = envKeysFilepath
    this.opsOn = opsOn

    this.processedEnvs = []
    this.changedFilepaths = new Set()
    this.unchangedFilepaths = new Set()
    this.readableFilepaths = new Set()
  }

  run () {
    // example
    // envs [
    //   { type: 'envFile', value: '.env' }
    // ]

    for (const env of this.envs) {
      if (env.type === TYPE_ENV_FILE) {
        this._setEnvFile(env.value)
      }
    }

    return {
      processedEnvs: this.processedEnvs,
      changedFilepaths: [...this.changedFilepaths],
      unchangedFilepaths: [...this.unchangedFilepaths]
    }
  }

  _setEnvFile (envFilepath) {
    const row = {}
    row.key = this.key || null
    row.value = this.value || null
    row.type = TYPE_ENV_FILE

    const filepath = path.resolve(envFilepath)
    row.filepath = filepath
    row.envFilepath = envFilepath
    row.changed = false

    try {
      const encoding = detectEncoding(filepath)
      let envSrc = fsx.readFileX(filepath, { encoding })
      const envParsed = dotenvParse(envSrc)
      row.originalValue = envParsed[row.key] || null
      const wasPlainText = !isEncrypted(row.originalValue)
      this.readableFilepaths.add(envFilepath)

      if (this.encrypt) {
        let publicKey
        let privateKey

        const { publicKeyName, privateKeyName } = keyNames(filepath)
        const { publicKeyValue, privateKeyValue } = keyValues(filepath, { keysFilepath: this.envKeysFilepath, opsOn: this.opsOn })

        // first pass - provision
        if (!privateKeyValue && !publicKeyValue) {
          const prov = provision({ envSrc, envFilepath, keysFilepath: this.envKeysFilepath, opsOn: this.opsOn })
          envSrc = prov.envSrc
          publicKey = prov.publicKey
          privateKey = prov.privateKey
          row.privateKeyAdded = prov.privateKeyAdded
          row.envKeysFilepath = prov.envKeysFilepath
        } else if (privateKeyValue) {
          const prov = provisionWithPrivateKey({ envSrc, envFilepath, keysFilepath: this.envKeysFilepath, privateKeyValue, publicKeyValue, publicKeyName })
          publicKey = prov.publicKey
          privateKey = prov.privateKey
          envSrc = prov.envSrc

          if (row.originalValue) {
            row.originalValue = decryptKeyValue(row.key, row.originalValue, privateKeyName, privateKey)
          }
        } else if (publicKeyValue) {
          publicKey = publicKeyValue
        }

        row.publicKey = publicKey
        row.privateKey = privateKey
        try {
          row.encryptedValue = encryptValue(this.value, publicKey)
        } catch {
          throw new Errors({ publicKeyName, publicKey }).invalidPublicKey()
        }
        row.privateKeyName = privateKeyName
      }

      const goingFromPlainTextToEncrypted = wasPlainText && this.encrypt
      const valueChanged = this.value !== row.originalValue
      if (goingFromPlainTextToEncrypted || valueChanged) {
        row.envSrc = replace(envSrc, this.key, row.encryptedValue || this.value)
        this.changedFilepaths.add(envFilepath)
        row.changed = true
      } else {
        row.envSrc = envSrc
        this.unchangedFilepaths.add(envFilepath)
        row.changed = false
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
}

module.exports = Sets
