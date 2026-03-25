const { logger } = require('./../../../shared/logger')

const Precommit = require('./../../../lib/services/precommit')

function precommit (directory) {
  // debug args
  logger.debug(`directory: ${directory}`)

  const options = this.opts()
  logger.debug(`options: ${JSON.stringify(options)}`)

  try {
    const {
      successMessage,
      warnings
    } = new Precommit(directory, options).run()

    for (const warning of warnings) {
      logger.warn(warning.message)
      if (warning.help) {
        logger.help(warning.help)
      }
    }

    logger.success(successMessage)
  } catch (error) {
    logger.error(error.message)
    if (error.help) {
      logger.help(error.help)
    }

    process.exit(1)
  }
}

module.exports = precommit
