// @ts-check
const path = require('path')

// shared
const { setLogLevel, setLogName, setLogVersion, logger } = require('./../shared/logger')
const { getColor, bold } = require('./../shared/colors')

// services
const Ls = require('./services/ls')
const Run = require('./services/run')
const Sets = require('./services/sets')
const Get = require('./services/get')
const Keypair = require('./services/keypair')
const Genexample = require('./services/genexample')

// helpers
const buildEnvs = require('./helpers/buildEnvs')
const Parse = require('./helpers/parse')
const fsx = require('./helpers/fsx')
const isIgnoringDotenvKeys = require('./helpers/isIgnoringDotenvKeys')

/** @type {import('./main').config} */
const config = function (options = {}) {
  // allow user to set processEnv to write to
  let processEnv = process.env
  if (options && options.processEnv != null) {
    processEnv = options.processEnv
  }

  // overload
  const overload = options.overload || options.override

  // ignore
  const ignore = options.ignore || []

  // strict
  const strict = options.strict

  // envKeysFile
  const envKeysFile = options.envKeysFile

  // DOTENV_KEY (DEPRECATED)
  let DOTENV_KEY = process.env.DOTENV_KEY
  if (options && options.DOTENV_KEY) {
    DOTENV_KEY = options.DOTENV_KEY
  }

  // dotenvx-ops related
  const opsOn = options.opsOff !== true

  if (options) {
    setLogLevel(options)
    setLogName(options)
    setLogVersion(options)
  }

  try {
    const envs = buildEnvs(options, DOTENV_KEY)
    const {
      processedEnvs,
      readableFilepaths,
      uniqueInjectedKeys
    } = new Run(envs, overload, DOTENV_KEY, processEnv, envKeysFile, opsOn).run()

    if (opsOn) {
      // removed radar feature for now. contact me at mot@dotenvx.com if still needed for your organization.
      // try { new Ops().observe({ beforeEnv, processedEnvs, afterEnv }) } catch {}
    }

    let lastError
    /** @type {Record<string, string>} */
    const parsedAll = {}
    for (const processedEnv of processedEnvs) {
      if (processedEnv.type === 'envVaultFile') {
        logger.verbose(`loading env from encrypted ${processedEnv.filepath} (${path.resolve(processedEnv.filepath)})`)
        logger.debug(`decrypting encrypted env from ${processedEnv.filepath} (${path.resolve(processedEnv.filepath)})`)
      }

      if (processedEnv.type === 'envFile') {
        logger.verbose(`loading env from ${processedEnv.filepath} (${path.resolve(processedEnv.filepath)})`)
      }

      for (const error of processedEnv.errors || []) {
        if (ignore.includes(error.code)) {
          logger.verbose(`ignored: ${error.message}`)
          continue // ignore error
        }

        if (strict) throw error // throw if strict and not ignored

        lastError = error // surface later in { error }

        if (error.code === 'MISSING_ENV_FILE') {
          if (!options.convention) { // do not output error for conventions (too noisy)
            logger.error(error.message)
            if (error.help) {
              logger.error(error.help)
            }
          }
        } else {
          logger.error(error.message)
          if (error.help) {
            logger.error(error.help)
          }
        }
      }

      Object.assign(parsedAll, processedEnv.injected || {})
      Object.assign(parsedAll, processedEnv.preExisted || {}) // preExisted 'wins'

      // debug parsed
      logger.debug(processedEnv.parsed)

      // verbose/debug injected key/value
      for (const [key, value] of Object.entries(processedEnv.injected || {})) {
        logger.verbose(`${key} set`)
        logger.debug(`${key} set to ${value}`)
      }

      // verbose/debug preExisted key/value
      for (const [key, value] of Object.entries(processedEnv.preExisted || {})) {
        logger.verbose(`${key} pre-exists (protip: use --overload to override)`)
        logger.debug(`${key} pre-exists as ${value} (protip: use --overload to override)`)
      }
    }

    let msg = `injecting env (${uniqueInjectedKeys.length})`
    if (readableFilepaths.length > 0) {
      msg += ` from ${readableFilepaths.join(', ')}`
    }
    logger.successv(msg)

    if (lastError) {
      return { parsed: parsedAll, error: lastError }
    } else {
      return { parsed: parsedAll }
    }
  } catch (error) {
    if (strict) throw error // throw immediately if strict

    logger.error(error.message)
    if (error.help) {
      logger.help(error.help)
    }

    return { parsed: {}, error }
  }
}

/** @type {import('./main').parse} */
const parse = function (src, options = {}) {
  // allow user to set processEnv to read from
  let processEnv = process.env
  if (options && options.processEnv != null) {
    processEnv = options.processEnv
  }

  // private decryption key
  const privateKey = options.privateKey || null

  // overload
  const overload = options.overload || options.override

  const { parsed, errors } = new Parse(src, privateKey, processEnv, overload).run()

  // display any errors
  for (const error of errors) {
    logger.error(error.message)
    if (error.help) {
      logger.error(error.help)
    }
  }

  return parsed
}

/* @type {import('./main').set} */
const set = function (key, value, options = {}) {
  // encrypt
  let encrypt = true
  if (options.plain) {
    encrypt = false
  } else if (options.encrypt === false) {
    encrypt = false
  }

  if (options) {
    setLogLevel(options)
    setLogName(options)
    setLogVersion(options)
  }

  const envs = buildEnvs(options)
  const envKeysFilepath = options.envKeysFile

  const {
    processedEnvs,
    changedFilepaths,
    unchangedFilepaths
  } = new Sets(key, value, envs, encrypt, envKeysFilepath).run()

  let withEncryption = ''

  if (encrypt) {
    withEncryption = ' with encryption'
  }

  for (const processedEnv of processedEnvs) {
    logger.verbose(`setting for ${processedEnv.envFilepath}`)

    if (processedEnv.error) {
      if (processedEnv.error.code === 'MISSING_ENV_FILE') {
        logger.warn(processedEnv.error.message)
        logger.help(`? add one with [echo "HELLO=World" > ${processedEnv.envFilepath}] and re-run [dotenvx set]`)
      } else {
        logger.warn(processedEnv.error.message)
        if (processedEnv.error.help) {
          logger.help(processedEnv.error.help)
        }
      }
    } else {
      fsx.writeFileX(processedEnv.filepath, processedEnv.envSrc)

      logger.verbose(`${processedEnv.key} set${withEncryption} (${processedEnv.envFilepath})`)
      logger.debug(`${processedEnv.key} set${withEncryption} to ${processedEnv.value} (${processedEnv.envFilepath})`)
    }
  }

  if (changedFilepaths.length > 0) {
    logger.success(`✔ set ${key}${withEncryption} (${changedFilepaths.join(',')})`)
  } else if (unchangedFilepaths.length > 0) {
    logger.info(`no changes (${unchangedFilepaths})`)
  } else {
    // do nothing
  }

  for (const processedEnv of processedEnvs) {
    if (processedEnv.privateKeyAdded) {
      logger.success(`✔ key added to ${processedEnv.envKeysFilepath} (${processedEnv.privateKeyName})`)
      // logger.help('⮕  optional: [dotenvx ops backup] to securely backup private key')

      if (!isIgnoringDotenvKeys()) {
        logger.help('⮕  next run: [dotenvx ext gitignore --pattern .env.keys] to gitignore .env.keys')
      }

      logger.help(`⮕  next run: [${processedEnv.privateKeyName}='${processedEnv.privateKey}' dotenvx get ${key}] to test decryption locally`)
    }
  }

  return {
    processedEnvs,
    changedFilepaths,
    unchangedFilepaths
  }
}

/* @type {import('./main').get} */
const get = function (key, options = {}) {
  const envs = buildEnvs(options)

  // ignore
  const ignore = options.ignore || []

  const { parsed, errors } = new Get(key, envs, options.overload, process.env.DOTENV_KEY, options.all, options.envKeysFile).run()

  for (const error of errors || []) {
    if (ignore.includes(error.code)) {
      continue // ignore error
    }

    if (options.strict) throw error // throw immediately if strict

    logger.error(error.message)
    if (error.help) {
      logger.error(error.help)
    }
  }

  if (key) {
    const single = parsed[key]
    if (single === undefined) {
      return undefined
    } else {
      return single
    }
  } else {
    if (options.format === 'eval') {
      let inline = ''
      for (const [key, value] of Object.entries(parsed)) {
        inline += `${key}=${escape(value)}\n`
      }
      inline = inline.trim()

      return inline
    } else if (options.format === 'shell') {
      let inline = ''
      for (const [key, value] of Object.entries(parsed)) {
        inline += `${key}=${value} `
      }
      inline = inline.trim()

      return inline
    } else {
      return parsed
    }
  }
}

/** @type {import('./main').ls} */
const ls = function (directory, envFile, excludeEnvFile) {
  return new Ls(directory, envFile, excludeEnvFile).run()
}

/** @type {import('./main').genexample} */
const genexample = function (directory, envFile) {
  return new Genexample(directory, envFile).run()
}

/** @type {import('./main').keypair} */
const keypair = function (envFile, key, envKeysFile = null) {
  const keypairs = new Keypair(envFile, envKeysFile).run()
  if (key) {
    return keypairs[key]
  } else {
    return keypairs
  }
}

module.exports = {
  // dotenv proxies
  config,
  parse,
  // actions related
  set,
  get,
  ls,
  keypair,
  genexample,
  // expose for libs depending on @dotenvx/dotenvx - like dotenvx-ops
  setLogLevel,
  logger,
  getColor,
  bold
}
