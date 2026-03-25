const fsx = require('./../../lib/helpers/fsx')
const { logger } = require('./../../shared/logger')

const Decrypt = require('./../../lib/services/decrypt')

const catchAndLog = require('../../lib/helpers/catchAndLog')

function decrypt () {
  const options = this.opts()
  logger.debug(`options: ${JSON.stringify(options)}`)

  const envs = this.envs
  const opsOn = options.opsOff !== true

  let errorCount = 0

  // stdout - should not have a try so that exit codes can surface to stdout
  if (options.stdout) {
    const {
      processedEnvs
    } = new Decrypt(envs, options.key, options.excludeKey, options.envKeysFile, opsOn).run()

    for (const processedEnv of processedEnvs) {
      if (processedEnv.error) {
        errorCount += 1
        logger.error(processedEnv.error.message)
        if (processedEnv.error.help) {
          logger.error(processedEnv.error.help)
        }
      } else {
        console.log(processedEnv.envSrc)
      }
    }

    if (errorCount > 0) {
      process.exit(1)
    } else {
      process.exit(0) // exit early
    }
  } else {
    try {
      const {
        processedEnvs,
        changedFilepaths,
        unchangedFilepaths
      } = new Decrypt(envs, options.key, options.excludeKey, options.envKeysFile, opsOn).run()

      for (const processedEnv of processedEnvs) {
        logger.verbose(`decrypting ${processedEnv.envFilepath} (${processedEnv.filepath})`)

        if (processedEnv.error) {
          errorCount += 1

          if (processedEnv.error.code === 'MISSING_ENV_FILE') {
            logger.error(processedEnv.error.message)
            logger.help(`? add one with [echo "HELLO=World" > ${processedEnv.envFilepath}] and re-run [dotenvx decrypt]`)
          } else {
            logger.error(processedEnv.error.message)
            if (processedEnv.error.help) {
              logger.error(processedEnv.error.help)
            }
          }
        } else if (processedEnv.changed) {
          fsx.writeFileX(processedEnv.filepath, processedEnv.envSrc)

          logger.verbose(`decrypted ${processedEnv.envFilepath} (${processedEnv.filepath})`)
        } else {
          logger.verbose(`no changes ${processedEnv.envFilepath} (${processedEnv.filepath})`)
        }
      }

      if (changedFilepaths.length > 0) {
        logger.success(`✔ decrypted (${changedFilepaths.join(',')})`)
      } else if (unchangedFilepaths.length > 0) {
        logger.info(`no changes (${unchangedFilepaths})`)
      } else {
        // do nothing - scenario when no .env files found
      }

      if (errorCount > 0) {
        process.exit(1)
      }
    } catch (error) {
      catchAndLog(error)
      process.exit(1)
    }
  }
}

module.exports = decrypt
