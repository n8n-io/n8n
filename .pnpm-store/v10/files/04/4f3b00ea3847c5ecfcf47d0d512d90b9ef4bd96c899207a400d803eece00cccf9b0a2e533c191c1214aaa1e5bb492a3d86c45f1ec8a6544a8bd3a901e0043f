const fsx = require('./../../lib/helpers/fsx')
const { logger } = require('./../../shared/logger')

const Rotate = require('./../../lib/services/rotate')

const catchAndLog = require('../../lib/helpers/catchAndLog')
const localDisplayPath = require('../../lib/helpers/localDisplayPath')

function rotate () {
  const options = this.opts()
  logger.debug(`options: ${JSON.stringify(options)}`)

  const envs = this.envs
  const opsOn = options.opsOff !== true

  // stdout - should not have a try so that exit codes can surface to stdout
  if (options.stdout) {
    const {
      processedEnvs
    } = new Rotate(envs, options.key, options.excludeKey, options.envKeysFile, opsOn).run()

    for (const processedEnv of processedEnvs) {
      console.log(processedEnv.envSrc)
      if (processedEnv.privateKeyAdded) {
        console.log('')
        console.log(processedEnv.envKeysSrc)
      }
    }
    process.exit(0) // exit early
  } else {
    try {
      const {
        processedEnvs,
        changedFilepaths,
        unchangedFilepaths
      } = new Rotate(envs, options.key, options.excludeKey, options.envKeysFile, opsOn).run()

      for (const processedEnv of processedEnvs) {
        logger.verbose(`rotating ${processedEnv.envFilepath} (${processedEnv.filepath})`)
        if (processedEnv.error) {
          logger.warn(processedEnv.error.messageWithHelp)
        } else if (processedEnv.changed) {
          fsx.writeFileX(processedEnv.filepath, processedEnv.envSrc)
          if (processedEnv.privateKeyAdded) {
            fsx.writeFileX(processedEnv.envKeysFilepath, processedEnv.envKeysSrc)
          }

          logger.verbose(`rotated ${processedEnv.envFilepath} (${processedEnv.filepath})`)
        } else {
          logger.verbose(`no changes ${processedEnv.envFilepath} (${processedEnv.filepath})`)
        }
      }

      if (changedFilepaths.length > 0) {
        const keyAddedEnv = processedEnvs.find((processedEnv) => processedEnv.privateKeyAdded)
        let msg = `⟳ rotated (${changedFilepaths.join(',')})`
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
    } catch (error) {
      catchAndLog(error)
      process.exit(1)
    }
  }
}

module.exports = rotate
