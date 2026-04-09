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
const localDisplayPath = require('./helpers/localDisplayPath')

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

  // dotenvx-ops related
  const opsOn = options.opsOff !== true

  if (options) {
    setLogLevel(options)
    setLogName(options)
    setLogVersion(options)
  }

  try {
    const envs = buildEnvs(options)
    const {
      processedEnvs,
      readableFilepaths,
      uniqueInjectedKeys
    } = new Run(envs, overload, processEnv, envKeysFile, opsOn).run()

    if (opsOn) {
      // removed radar feature for now. contact me at mot@dotenvx.com if still needed for your organization.
      // try { new Ops().observe({ beforeEnv, processedEnvs, afterEnv }) } catch {}
    }

    let lastError
    /** @type {Record<string, string>} */
    const parsedAll = {}
    for (const processedEnv of processedEnvs) {
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
            logger.error(error.messageWithHelp)
          }
        } else {
          logger.error(error.messageWithHelp)
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

    logger.error(error.messageWithHelp)

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
    logger.error(error.messageWithHelp)
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
  const opsOn = options.opsOff !== true

  const {
    processedEnvs,
    changedFilepaths,
    unchangedFilepaths
  } = new Sets(key, value, envs, encrypt, envKeysFilepath, opsOn).run()

  let withEncryption = ''

  if (encrypt) {
    withEncryption = ' with encryption'
  }

  for (const processedEnv of processedEnvs) {
    logger.verbose(`setting for ${processedEnv.envFilepath}`)

    if (processedEnv.error) {
      const error = processedEnv.error
      const message = error.messageWithHelp || (error.help ? `${error.message}. ${error.help}` : error.message)
      logger.warn(message)
    } else {
      fsx.writeFileX(processedEnv.filepath, processedEnv.envSrc)

      logger.verbose(`${processedEnv.key} set${withEncryption} (${processedEnv.envFilepath})`)
      logger.debug(`${processedEnv.key} set${withEncryption} to ${processedEnv.value} (${processedEnv.envFilepath})`)
    }
  }

  const keyAddedEnv = processedEnvs.find((processedEnv) => processedEnv.privateKeyAdded)
  const keyAddedSuffix = keyAddedEnv ? ` + key (${localDisplayPath(keyAddedEnv.envKeysFilepath)})` : ''

  if (changedFilepaths.length > 0) {
    if (encrypt) {
      logger.success(`◈ encrypted ${key} (${changedFilepaths.join(',')})${keyAddedSuffix}`)
    } else {
      logger.success(`◇ set ${key} (${changedFilepaths.join(',')})`)
    }
  } else if (encrypt && keyAddedEnv) {
    const keyAddedEnvFilepath = keyAddedEnv.envFilepath || changedFilepaths[0] || '.env'
    logger.success(`◈ encrypted ${key} (${keyAddedEnvFilepath})${keyAddedSuffix}`)
  } else if (unchangedFilepaths.length > 0) {
    logger.info(`○ no changes (${unchangedFilepaths})`)
  } else {
    // do nothing
  }

  // intentionally quiet: success line communicates key creation

  return {
    processedEnvs,
    changedFilepaths,
    unchangedFilepaths
  }
}

/* @type {import('./main').get} */
const get = function (key, options = {}) {
  const envs = buildEnvs(options)
  const opsOn = options.opsOff !== true

  // ignore
  const ignore = options.ignore || []

  const { parsed, errors } = new Get(key, envs, options.overload, options.all, options.envKeysFile, opsOn).run()

  for (const error of errors || []) {
    if (ignore.includes(error.code)) {
      continue // ignore error
    }

    if (options.strict) throw error // throw immediately if strict

    logger.error(error.messageWithHelp)
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
const keypair = function (envFile, key, envKeysFile = null, opsOff = false) {
  const opsOn = opsOff !== true
  const keypairs = new Keypair(envFile, envKeysFile, opsOn).run()
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
