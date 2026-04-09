const conventions = require('./conventions')
const dotenvOptionPaths = require('./dotenvOptionPaths')

function buildEnvs (options) {
  // build envs using user set option.path
  const optionPaths = dotenvOptionPaths(options) // [ '.env' ]

  let envs = []
  if (options.convention) { // handle shorthand conventions
    envs = conventions(options.convention).concat(envs)
  }

  for (const optionPath of optionPaths) {
    envs.push({ type: 'envFile', value: optionPath })
  }

  return envs
}

module.exports = buildEnvs
