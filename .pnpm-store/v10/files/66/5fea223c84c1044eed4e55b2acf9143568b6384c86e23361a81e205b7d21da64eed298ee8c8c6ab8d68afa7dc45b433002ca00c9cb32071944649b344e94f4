const fsx = require('./../helpers/fsx')
const path = require('path')

const TYPE_ENV = 'env'
const TYPE_ENV_FILE = 'envFile'
const TYPE_ENV_VAULT_FILE = 'envVaultFile'

const decrypt = require('./../helpers/decrypt')
const Parse = require('./../helpers/parse')
const Errors = require('./../helpers/errors')
const dotenvParse = require('./../helpers/dotenvParse')
const parseEnvironmentFromDotenvKey = require('./../helpers/parseEnvironmentFromDotenvKey')
const detectEncoding = require('./../helpers/detectEncoding')
const { findPrivateKey } = require('./../helpers/findPrivateKey')
const findPublicKey = require('./../helpers/findPublicKey')
const guessPrivateKeyName = require('./../helpers/guessPrivateKeyName')
const determineEnvs = require('./../helpers/determineEnvs')

class Run {
  constructor (envs = [], overload = false, DOTENV_KEY = '', processEnv = process.env, envKeysFilepath = null, opsOn = true) {
    this.envs = determineEnvs(envs, processEnv, DOTENV_KEY)
    this.overload = overload
    this.DOTENV_KEY = DOTENV_KEY
    this.processEnv = processEnv
    this.envKeysFilepath = envKeysFilepath
    this.opsOn = opsOn

    this.processedEnvs = []
    this.readableFilepaths = new Set()
    this.readableStrings = new Set()
    this.uniqueInjectedKeys = new Set()
    this.beforeEnv = { ...this.processEnv }
  }

  run () {
    // example
    // envs [
    //   { type: 'envVaultFile', value: '.env.vault' },
    //   { type: 'env', value: 'HELLO=one' },
    //   { type: 'envFile', value: '.env' },
    //   { type: 'env', value: 'HELLO=three' }
    // ]

    for (const env of this.envs) {
      if (env.type === TYPE_ENV_VAULT_FILE) { // deprecate someday - for deprecated .env.vault files
        this._injectEnvVaultFile(env.value)
      } else if (env.type === TYPE_ENV_FILE) {
        this._injectEnvFile(env.value)
      } else if (env.type === TYPE_ENV) {
        this._injectEnv(env.value)
      }
    }

    return {
      processedEnvs: this.processedEnvs,
      readableStrings: [...this.readableStrings],
      readableFilepaths: [...this.readableFilepaths],
      uniqueInjectedKeys: [...this.uniqueInjectedKeys],
      beforeEnv: this.beforeEnv,
      afterEnv: { ...this.processEnv }
    }
  }

  _injectEnv (env) {
    const row = {}
    row.type = TYPE_ENV
    row.string = env

    try {
      const { parsed, errors, injected, preExisted } = new Parse(env, null, this.processEnv, this.overload).run()
      row.parsed = parsed
      row.errors = errors
      row.injected = injected
      row.preExisted = preExisted

      this.inject(row.parsed) // inject

      this.readableStrings.add(env)

      for (const key of Object.keys(injected)) {
        this.uniqueInjectedKeys.add(key) // track uniqueInjectedKeys across multiple files
      }
    } catch (e) {
      row.errors = [e]
    }

    this.processedEnvs.push(row)
  }

  _injectEnvFile (envFilepath) {
    const row = {}
    row.type = TYPE_ENV_FILE
    row.filepath = envFilepath

    const filepath = path.resolve(envFilepath)
    try {
      const encoding = detectEncoding(filepath)
      const src = fsx.readFileX(filepath, { encoding })
      this.readableFilepaths.add(envFilepath)

      const publicKey = findPublicKey(envFilepath)
      const privateKey = findPrivateKey(envFilepath, this.envKeysFilepath, this.opsOn, publicKey)
      const privateKeyName = guessPrivateKeyName(envFilepath)
      const { parsed, errors, injected, preExisted } = new Parse(src, privateKey, this.processEnv, this.overload, privateKeyName).run()

      row.privateKeyName = privateKeyName
      row.privateKey = privateKey
      row.src = src
      row.parsed = parsed
      row.errors = errors
      row.injected = injected
      row.preExisted = preExisted

      this.inject(row.parsed) // inject

      for (const key of Object.keys(injected)) {
        this.uniqueInjectedKeys.add(key) // track uniqueInjectedKeys across multiple files
      }
    } catch (e) {
      if (e.code === 'ENOENT' || e.code === 'EISDIR') {
        row.errors = [new Errors({ envFilepath, filepath }).missingEnvFile()]
      } else {
        row.errors = [e]
      }
    }

    this.processedEnvs.push(row)
  }

  _injectEnvVaultFile (envVaultFilepath) {
    const row = {}
    row.type = TYPE_ENV_VAULT_FILE
    row.filepath = envVaultFilepath

    const filepath = path.resolve(envVaultFilepath)
    this.readableFilepaths.add(envVaultFilepath)

    if (!fsx.existsSync(filepath)) {
      const code = 'MISSING_ENV_VAULT_FILE'
      const message = `you set DOTENV_KEY but your .env.vault file is missing: ${filepath}`
      const error = new Error(message)
      error.code = code
      throw error
    }

    if (this.DOTENV_KEY.length < 1) {
      const code = 'MISSING_DOTENV_KEY'
      const message = `your DOTENV_KEY appears to be blank: '${this.DOTENV_KEY}'`
      const error = new Error(message)
      error.code = code
      throw error
    }

    let decrypted
    const dotenvKeys = this._dotenvKeys()
    const parsedVault = this._parsedVault(filepath)
    for (let i = 0; i < dotenvKeys.length; i++) {
      try {
        const dotenvKey = dotenvKeys[i].trim() // dotenv://key_1234@...?environment=prod

        decrypted = this._decrypted(dotenvKey, parsedVault)

        break
      } catch (error) {
        // last key
        if (i + 1 >= dotenvKeys.length) {
          throw error
        }
        // try next key
      }
    }

    try {
      // parse this. it's the equivalent of the .env file
      const { parsed, errors, injected, preExisted } = new Parse(decrypted, null, this.processEnv, this.overload).run()
      row.parsed = parsed
      row.errors = errors
      row.injected = injected
      row.preExisted = preExisted

      this.inject(row.parsed) // inject

      for (const key of Object.keys(injected)) {
        this.uniqueInjectedKeys.add(key) // track uniqueInjectedKeys across multiple files
      }
    } catch (e) {
      row.errors = [e]
    }

    this.processedEnvs.push(row)
  }

  inject (parsed) {
    for (const key of Object.keys(parsed)) {
      this.processEnv[key] = parsed[key] // inject to process.env
    }
  }

  // handle scenario for comma separated keys - for use with key rotation
  // example: DOTENV_KEY="dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=prod,dotenv://:key_7890@dotenvx.com/vault/.env.vault?environment=prod"
  _dotenvKeys () {
    return this.DOTENV_KEY.split(',')
  }

  // { "DOTENV_VAULT_DEVELOPMENT": "<ciphertext>" }
  _parsedVault (filepath) {
    const src = fsx.readFileX(filepath)
    return dotenvParse(src)
  }

  _decrypted (dotenvKey, parsedVault) {
    const environment = parseEnvironmentFromDotenvKey(dotenvKey)

    // DOTENV_KEY_PRODUCTION
    const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`
    const ciphertext = parsedVault[environmentKey]
    if (!ciphertext) {
      const error = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: cannot locate environment ${environmentKey} in your .env.vault file`)
      error.code = 'NOT_FOUND_DOTENV_ENVIRONMENT'

      throw error
    }

    return decrypt(ciphertext, dotenvKey)
  }
}

module.exports = Run
