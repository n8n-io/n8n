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
const detectEncoding = require('./../helpers/detectEncoding')
const determineEnvs = require('./../helpers/determineEnvs')
const { findPrivateKey } = require('./../helpers/findPrivateKey')
const findPublicKey = require('./../helpers/findPublicKey')
const keypair = require('./../helpers/keypair')
const truncate = require('./../helpers/truncate')
const isPublicKey = require('./../helpers/isPublicKey')

class Encrypt {
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
        this._encryptEnvFile(env.value)
      }
    }

    return {
      processedEnvs: this.processedEnvs,
      changedFilepaths: [...this.changedFilepaths],
      unchangedFilepaths: [...this.unchangedFilepaths]
    }
  }

  _encryptEnvFile (envFilepath) {
    const row = {}
    row.keys = []
    row.type = TYPE_ENV_FILE

    const filename = path.basename(envFilepath)
    const filepath = path.resolve(envFilepath)
    row.filepath = filepath
    row.envFilepath = envFilepath

    try {
      const encoding = this._detectEncoding(filepath)
      let envSrc = fsx.readFileX(filepath, { encoding })
      const envParsed = dotenvParse(envSrc)

      let publicKey
      let privateKey

      const publicKeyName = guessPublicKeyName(envFilepath)
      const privateKeyName = guessPrivateKeyName(envFilepath)
      const existingPublicKey = findPublicKey(envFilepath)
      const existingPrivateKey = findPrivateKey(envFilepath, this.envKeysFilepath, this.opsOn, existingPublicKey)

      let envKeysFilepath = path.join(path.dirname(filepath), '.env.keys')
      if (this.envKeysFilepath) {
        envKeysFilepath = path.resolve(this.envKeysFilepath)
      }
      const relativeFilepath = path.relative(path.dirname(filepath), envKeysFilepath)

      if (existingPrivateKey) {
        // throw new Error('implement for remote Ops existingPrivateKey')
        const kp = keypair(existingPrivateKey)
        publicKey = kp.publicKey
        privateKey = kp.privateKey

        // if derivation doesn't match what's in the file (or preset in env)
        if (existingPublicKey && existingPublicKey !== publicKey) {
          const error = new Error(`derived public key (${truncate(publicKey)}) does not match the existing public key (${truncate(existingPublicKey)})`)
          error.code = 'INVALID_DOTENV_PRIVATE_KEY'
          error.help = `debug info: ${privateKeyName}=${truncate(existingPrivateKey)} (derived ${publicKeyName}=${truncate(publicKey)} vs existing ${publicKeyName}=${truncate(existingPublicKey)})`
          throw error
        }

        // typical scenario when encrypting a monorepo second .env file from a prior generated -fk .env.keys file
        if (!existingPublicKey) {
          const ps = this._preserveShebang(envSrc)
          const firstLinePreserved = ps.firstLinePreserved
          envSrc = ps.envSrc

          const prependPublicKey = this._prependPublicKey(publicKeyName, publicKey, filename, relativeFilepath)

          envSrc = `${firstLinePreserved}${prependPublicKey}\n${envSrc}`
        }
      } else if (existingPublicKey) {
        // throw new Error('implement for remote Ops existingPrivateKey')
        publicKey = existingPublicKey
      } else {
        // .env.keys
        let keysSrc = ''

        if (fsx.existsSync(envKeysFilepath)) {
          keysSrc = fsx.readFileX(envKeysFilepath)
        }

        const ps = this._preserveShebang(envSrc)
        const firstLinePreserved = ps.firstLinePreserved
        envSrc = ps.envSrc

        // TODO: instead get this from API
        const kp = keypair() // generates a fresh keypair in memory
        publicKey = kp.publicKey
        privateKey = kp.privateKey
        // Ops hook point (first-time key generation):
        // if Ops is installed and opsOff is not set, send privateKey/privateKeyName/envFilepath
        // to your Ops service before persisting or immediately after writing below.

        const prependPublicKey = this._prependPublicKey(publicKeyName, publicKey, filename, relativeFilepath)

        // privateKey
        const firstTimeKeysSrc = [
          '#/------------------!DOTENV_PRIVATE_KEYS!-------------------/',
          '#/ private decryption keys. DO NOT commit to source control /',
          '#/     [how it works](https://dotenvx.com/encryption)       /',
          // '#/           backup with: `dotenvx ops backup`              /',
          '#/----------------------------------------------------------/'
        ].join('\n')
        const appendPrivateKey = [
          `# ${filename}`,
          `${privateKeyName}=${privateKey}`,
          ''
        ].join('\n')

        envSrc = `${firstLinePreserved}${prependPublicKey}\n${envSrc}`
        keysSrc = keysSrc.length > 1 ? keysSrc : `${firstTimeKeysSrc}\n`
        keysSrc = `${keysSrc}\n${appendPrivateKey}`

        // write to .env.keys
        fsx.writeFileX(envKeysFilepath, keysSrc)
        // Ops hook point (after persistence):
        // if Ops is installed and opsOff is not set, trigger backup/registration now that
        // .env.keys has been written and row.privateKeyAdded will be true for callers.

        row.privateKeyAdded = true
        row.envKeysFilepath = this.envKeysFilepath || path.join(path.dirname(envFilepath), path.basename(envKeysFilepath))
      }

      row.publicKey = publicKey
      row.privateKey = privateKey
      row.privateKeyName = privateKeyName

      // iterate over all non-encrypted values and encrypt them
      for (const [key, value] of Object.entries(envParsed)) {
        // key excluded - don't encrypt it
        if (this.exclude(key)) {
          continue
        }

        // key effectively excluded (by not being in the list of includes) - don't encrypt it
        if (this.keys.length > 0 && !this.include(key)) {
          continue
        }

        const encrypted = isEncrypted(value) || isPublicKey(key, value)
        if (!encrypted) {
          row.keys.push(key) // track key(s)

          const encryptedValue = encryptValue(value, publicKey)

          // once newSrc is built write it out
          envSrc = replace(envSrc, key, encryptedValue)

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

  _prependPublicKey (publicKeyName, publicKey, filename, relativeFilepath = '') {
    const comment = relativeFilepath === '.env.keys' ? '' : ` # ${relativeFilepath}`

    return [
      '#/-------------------[DOTENV_PUBLIC_KEY]--------------------/',
      '#/            public-key encryption for .env files          /',
      '#/       [how it works](https://dotenvx.com/encryption)     /',
      '#/----------------------------------------------------------/',
      `${publicKeyName}="${publicKey}"${comment}`,
      '',
      `# ${filename}`
    ].join('\n')
  }

  _preserveShebang (envSrc) {
    // preserve shebang
    const [firstLine, ...remainingLines] = envSrc.split('\n')
    let firstLinePreserved = ''

    if (firstLine.startsWith('#!')) {
      firstLinePreserved = firstLine + '\n'
      envSrc = remainingLines.join('\n')
    }

    return {
      firstLinePreserved,
      envSrc
    }
  }
}

module.exports = Encrypt
