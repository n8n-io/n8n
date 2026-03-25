const PRIVATE_KEY_NAME_SCHEMA = 'DOTENV_PRIVATE_KEY'

function dotenvPrivateKeyNames (processEnv) {
  return Object.keys(processEnv).filter(key => key.startsWith(PRIVATE_KEY_NAME_SCHEMA))
}

module.exports = dotenvPrivateKeyNames
