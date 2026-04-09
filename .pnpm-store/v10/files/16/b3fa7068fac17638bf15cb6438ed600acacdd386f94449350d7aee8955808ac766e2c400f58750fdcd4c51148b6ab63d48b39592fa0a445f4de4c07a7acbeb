const fsx = require('./../../lib/helpers/fsx')
const { logger } = require('./../../shared/logger')

const Encrypt = require('./../../lib/services/encrypt')

const catchAndLog = require('../../lib/helpers/catchAndLog')
const localDisplayPath = require('../../lib/helpers/localDisplayPath')

function encrypt () {
  const options = this.opts()
  logger.debug(`options: ${JSON.stringify(options)}`)

  const envs = this.envs
  const opsOn = options.opsOff !== true

  // stdout - should not have a try so that exit codes can surface to stdout
  if (options.stdout) {
    const {
      processedEnvs
    } = new Encrypt(envs, options.key, options.excludeKey, options.envKeysFile, opsOn).run()

    for (const processedEnv of processedEnvs) {
      console.log(processedEnv.envSrc)
    }
    process.exit(0) // exit early
  } else {
    try {
      const {
        processedEnvs,
        changedFilepaths,
        unchangedFilepaths
      } = new Encrypt(envs, options.key, options.excludeKey, options.envKeysFile, opsOn).run()

      for (const processedEnv of processedEnvs) {
        logger.verbose(`encrypting ${processedEnv.envFilepath} (${processedEnv.filepath})`)
        if (processedEnv.error) {
          logger.warn(processedEnv.error.messageWithHelp)
        } else if (processedEnv.changed) {
          fsx.writeFileX(processedEnv.filepath, processedEnv.envSrc)

          logger.verbose(`encrypted ${processedEnv.envFilepath} (${processedEnv.filepath})`)
        } else {
          logger.verbose(`no changes ${processedEnv.envFilepath} (${processedEnv.filepath})`)
        }
      }

      if (changedFilepaths.length > 0) {
        const keyAddedEnv = processedEnvs.find((processedEnv) => processedEnv.privateKeyAdded)
        let msg = `◈ encrypted (${changedFilepaths.join(',')})`
        if (keyAddedEnv) {
          const envKeysFilepath = localDisplayPath(keyAddedEnv.envKeysFilepath)
          msg += ` + key (${envKeysFilepath})`
        }
        logger.success(msg)
      } else if (unchangedFilepaths.length > 0) {
        logger.info(`○ no changes (${unchangedFilepaths})`)
      } else {
        // do nothing - scenario when no .env files found
      }

      for (const processedEnv of processedEnvs) {
        if (processedEnv.privateKeyAdded) {
          // intentionally quiet: success line already communicates key creation
        }
      }
    } catch (error) {
      catchAndLog(error)
      process.exit(1)
    }
  }
}

module.exports = encrypt
