const fsx = require('./../../lib/helpers/fsx')
const { logger } = require('./../../shared/logger')

const Rotate = require('./../../lib/services/rotate')

const catchAndLog = require('../../lib/helpers/catchAndLog')
const isIgnoringDotenvKeys = require('../../lib/helpers/isIgnoringDotenvKeys')

function rotate () {
  const options = this.opts()
  logger.debug(`options: ${JSON.stringify(options)}`)

  const envs = this.envs

  // stdout - should not have a try so that exit codes can surface to stdout
  if (options.stdout) {
    const {
      processedEnvs
    } = new Rotate(envs, options.key, options.excludeKey, options.envKeysFile).run()

    for (const processedEnv of processedEnvs) {
      console.log(processedEnv.envSrc)
      console.log('')
      console.log(processedEnv.envKeysSrc)
    }
    process.exit(0) // exit early
  } else {
    try {
      const {
        processedEnvs,
        changedFilepaths,
        unchangedFilepaths
      } = new Rotate(envs, options.key, options.excludeKey, options.envKeysFile).run()

      for (const processedEnv of processedEnvs) {
        logger.verbose(`rotating ${processedEnv.envFilepath} (${processedEnv.filepath})`)
        if (processedEnv.error) {
          if (processedEnv.error.code === 'MISSING_ENV_FILE') {
            logger.warn(processedEnv.error.message)
            logger.help(`? add one with [echo "HELLO=World" > ${processedEnv.envFilepath}] and re-run [dotenvx rotate]`)
          } else {
            logger.warn(processedEnv.error.message)
            if (processedEnv.error.help) {
              logger.help(processedEnv.error.help)
            }
          }
        } else if (processedEnv.changed) {
          fsx.writeFileX(processedEnv.filepath, processedEnv.envSrc)
          fsx.writeFileX(processedEnv.envKeysFilepath, processedEnv.envKeysSrc)

          logger.verbose(`rotated ${processedEnv.envFilepath} (${processedEnv.filepath})`)
        } else {
          logger.verbose(`no changes ${processedEnv.envFilepath} (${processedEnv.filepath})`)
        }
      }

      if (changedFilepaths.length > 0) {
        logger.success(`✔ rotated (${changedFilepaths.join(',')})`)
      } else if (unchangedFilepaths.length > 0) {
        logger.info(`no changes (${unchangedFilepaths})`)
      } else {
        // do nothing - scenario when no .env files found
      }

      for (const processedEnv of processedEnvs) {
        if (processedEnv.privateKeyAdded) {
          logger.success(`✔ key added to .env.keys (${processedEnv.privateKeyName})`)
          // logger.help('⮕  optional: [dotenvx ops backup] to securely backup private key')

          if (!isIgnoringDotenvKeys()) {
            logger.help('⮕  next run: [dotenvx ext gitignore --pattern .env.keys] to gitignore .env.keys')
          }

          logger.help(`⮕  next run: [${processedEnv.privateKeyName}='${processedEnv.privateKey}' dotenvx get] to test decryption locally`)
        }
      }
    } catch (error) {
      catchAndLog(error)
      process.exit(1)
    }
  }
}

module.exports = rotate
