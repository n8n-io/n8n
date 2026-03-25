const dotenvPrivateKeyNames = require('./dotenvPrivateKeyNames')
const guessPrivateKeyFilename = require('./guessPrivateKeyFilename')

const TYPE_ENV_FILE = 'envFile'
const TYPE_ENV_VAULT_FILE = 'envVaultFile'
const DEFAULT_ENVS = [{ type: TYPE_ENV_FILE, value: '.env' }]
const DEFAULT_ENV_VAULTS = [{ type: TYPE_ENV_VAULT_FILE, value: '.env.vault' }]

function determineEnvsFromDotenvPrivateKey (privateKeyNames) {
  const envs = []

  for (const privateKeyName of privateKeyNames) {
    const filename = guessPrivateKeyFilename(privateKeyName)
    envs.push({ type: TYPE_ENV_FILE, value: filename })
  }

  return envs
}

function determineEnvs (envs = [], processEnv, DOTENV_KEY = '') {
  const privateKeyNames = dotenvPrivateKeyNames(processEnv)
  if (!envs || envs.length <= 0) {
    // if process.env.DOTENV_PRIVATE_KEY or process.env.DOTENV_PRIVATE_KEY_${environment} is set, assume inline encryption methodology
    if (privateKeyNames.length > 0) {
      return determineEnvsFromDotenvPrivateKey(privateKeyNames)
    }

    if (DOTENV_KEY.length > 0) {
      // if DOTENV_KEY is set then default to look for .env.vault file
      return DEFAULT_ENV_VAULTS
    } else {
      return DEFAULT_ENVS // default to .env file expectation
    }
  } else {
    let fileAlreadySpecified = false // can be .env or .env.vault type

    for (const env of envs) {
      // if DOTENV_KEY set then we are checking if a .env.vault file is already specified
      if (DOTENV_KEY.length > 0 && env.type === TYPE_ENV_VAULT_FILE) {
        fileAlreadySpecified = true
      }

      // if DOTENV_KEY not set then we are checking if a .env file is already specified
      if (DOTENV_KEY.length <= 0 && env.type === TYPE_ENV_FILE) {
        fileAlreadySpecified = true
      }
    }

    // return early since envs array objects already contain 1 .env.vault or .env file
    if (fileAlreadySpecified) {
      return envs
    }

    // no .env.vault or .env file specified as a flag so we assume either .env.vault (if dotenv key is set) or a .env file
    if (DOTENV_KEY.length > 0) {
      // if DOTENV_KEY is set then default to look for .env.vault file
      return [...DEFAULT_ENV_VAULTS, ...envs]
    } else {
      // if no DOTENV_KEY then default to look for .env file
      return [...DEFAULT_ENVS, ...envs]
    }
  }
}

module.exports = determineEnvs
