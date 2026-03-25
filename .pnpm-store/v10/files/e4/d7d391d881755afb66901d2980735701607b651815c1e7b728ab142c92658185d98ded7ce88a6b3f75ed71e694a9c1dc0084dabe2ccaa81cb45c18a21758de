const treeify = require('object-treeify')

const { logger } = require('./../../shared/logger')

const main = require('./../../lib/main')
const ArrayToTree = require('./../../lib/helpers/arrayToTree')

function ls (directory) {
  // debug args
  logger.debug(`directory: ${directory}`)

  const options = this.opts()
  logger.debug(`options: ${JSON.stringify(options)}`)

  const filepaths = main.ls(directory, options.envFile, options.excludeEnvFile)
  logger.debug(`filepaths: ${JSON.stringify(filepaths)}`)

  const tree = new ArrayToTree(filepaths).run()
  logger.debug(`tree: ${JSON.stringify(tree)}`)

  logger.info(treeify(tree))
}

module.exports = ls
