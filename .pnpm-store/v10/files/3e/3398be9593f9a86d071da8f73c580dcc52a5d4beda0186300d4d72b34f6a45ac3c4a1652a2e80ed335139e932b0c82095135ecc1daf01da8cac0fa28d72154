const fsx = require('./../../lib/helpers/fsx')
const { logger } = require('./../../shared/logger')

const Sets = require('./../../lib/services/sets')

const catchAndLog = require('../../lib/helpers/catchAndLog')
const isIgnoringDotenvKeys = require('../../lib/helpers/isIgnoringDotenvKeys')

function set (key, value) {
  logger.debug(`key: ${key}`)
  logger.debug(`value: ${value}`)

  const options = this.opts()
  logger.debug(`options: ${JSON.stringify(options)}`)

  // encrypt
  let encrypt = true
  if (options.plain) {
    encrypt = false
  }

  try {
    const envs = this.envs
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
  } catch (error) {
    catchAndLog(error)
    process.exit(1)
  }
}

module.exports = set
