const path = require('path')
const guessEnvironment = require('./guessEnvironment')

function guessPrivateKeyName (filepath) {
  const filename = path.basename(filepath).toLowerCase()

  // .env
  if (filename === '.env') {
    return 'DOTENV_PRIVATE_KEY'
  }

  // .env.ENVIRONMENT
  const environment = guessEnvironment(filename)

  return `DOTENV_PRIVATE_KEY_${environment.toUpperCase()}`
}

module.exports = guessPrivateKeyName
