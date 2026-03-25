const path = require('path')

const conventions = require('./conventions')
const dotenvOptionPaths = require('./dotenvOptionPaths')
const DeprecationNotice = require('./deprecationNotice')

function buildEnvs (options, DOTENV_KEY = undefined) {
  // build envs using user set option.path
  const optionPaths = dotenvOptionPaths(options) // [ '.env' ]

  let envs = []
  if (options.convention) { // handle shorthand conventions
    envs = conventions(options.convention).concat(envs)
  }

  new DeprecationNotice({ DOTENV_KEY }).dotenvKey() // DEPRECATION NOTICE

  for (const optionPath of optionPaths) {
    // if DOTENV_KEY is set then assume we are checking envVaultFile
    if (DOTENV_KEY) {
      envs.push({
        type: 'envVaultFile',
        value: path.join(path.dirname(optionPath), '.env.vault')
      })
    } else {
      envs.push({ type: 'envFile', value: optionPath })
    }
  }

  return envs
}

module.exports = buildEnvs
