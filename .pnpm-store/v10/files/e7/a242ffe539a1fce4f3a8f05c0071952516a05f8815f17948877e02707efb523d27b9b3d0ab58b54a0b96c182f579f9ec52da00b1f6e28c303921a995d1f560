const fsx = require('./../../../lib/helpers/fsx')
const path = require('path')
const main = require('./../../../lib/main')
const { logger } = require('./../../../shared/logger')
const catchAndLog = require('./../../../lib/helpers/catchAndLog')

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
      logger.success(`▣ generated (${path.basename(exampleFilepath)})`)
    } else {
      logger.info('○ no changes (.env.example)')
    }
  } catch (error) {
    catchAndLog(error)
    process.exit(1)
  }
}

module.exports = genexample
