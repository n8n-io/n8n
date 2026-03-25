const fsx = require('./../../../lib/helpers/fsx')
const main = require('./../../../lib/main')
const { logger } = require('./../../../shared/logger')

function genexample (directory) {
  logger.debug(`directory: ${directory}`)

  const options = this.opts()
  logger.debug(`options: ${JSON.stringify(options)}`)

  try {
    const {
      envExampleFile,
      envFile,
      exampleFilepath,
      addedKeys
    } = main.genexample(directory, options.envFile)

    logger.verbose(`loading env from ${envFile}`)

    fsx.writeFileX(exampleFilepath, envExampleFile)

    if (addedKeys.length > 0) {
      logger.success(`updated .env.example (${addedKeys.length})`)
    } else {
      logger.info('no changes (.env.example)')
    }
  } catch (error) {
    logger.error(error.message)
    if (error.help) {
      logger.help(error.help)
    }
    if (error.code) {
      logger.debug(`ERROR_CODE: ${error.code}`)
    }
    process.exit(1)
  }
}

module.exports = genexample
