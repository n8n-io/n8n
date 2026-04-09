const path = require('path')
const environment = require('./../envResolution/environment')

function keyNames (filepath) {
  const filename = path.basename(filepath).toLowerCase()

  // .env
  if (filename === '.env') {
    return {
      publicKeyName: 'DOTENV_PUBLIC_KEY',
      privateKeyName: 'DOTENV_PRIVATE_KEY'
    }
  }

  // .env.ENVIRONMENT
  const resolvedEnvironment = environment(filename).toUpperCase()

  return {
    publicKeyName: `DOTENV_PUBLIC_KEY_${resolvedEnvironment}`,
    privateKeyName: `DOTENV_PRIVATE_KEY_${resolvedEnvironment}`
  }
}

module.exports = keyNames
