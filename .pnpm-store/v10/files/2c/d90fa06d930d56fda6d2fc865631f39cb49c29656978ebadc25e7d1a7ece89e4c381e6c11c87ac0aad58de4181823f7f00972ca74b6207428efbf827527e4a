const fsx = require('./../helpers/fsx')
const path = require('path')

const TYPE_ENV = 'env'
const TYPE_ENV_FILE = 'envFile'

const Parse = require('./../helpers/parse')
const Errors = require('./../helpers/errors')
const detectEncoding = require('./../helpers/detectEncoding')

const {
  keyNames,
  keyValues
} = require('./../helpers/keyResolution')

const {
  determine
} = require('./../helpers/envResolution')

class Run {
  constructor (envs = [], overload = false, processEnv = process.env, envKeysFilepath = null, opsOn = false) {
    this.envs = determine(envs, processEnv)
    this.overload = overload
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
    //   { type: 'env', value: 'HELLO=one' },
    //   { type: 'envFile', value: '.env' },
    //   { type: 'env', value: 'HELLO=three' }
    // ]

    for (const env of this.envs) {
      if (env.type === TYPE_ENV_FILE) {
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
      const {
        parsed,
        errors,
        injected,
        preExisted
      } = new Parse(env, null, this.processEnv, this.overload).run()

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

      const { privateKeyName } = keyNames(filepath)
      const { privateKeyValue } = keyValues(filepath, { keysFilepath: this.envKeysFilepath, opsOn: this.opsOn })

      const {
        parsed,
        errors,
        injected,
        preExisted
      } = new Parse(src, privateKeyValue, this.processEnv, this.overload, privateKeyName).run()

      row.privateKeyName = privateKeyName
      row.privateKey = privateKeyValue
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

  inject (parsed) {
    for (const key of Object.keys(parsed)) {
      this.processEnv[key] = parsed[key] // inject to process.env
    }
  }
}

module.exports = Run
