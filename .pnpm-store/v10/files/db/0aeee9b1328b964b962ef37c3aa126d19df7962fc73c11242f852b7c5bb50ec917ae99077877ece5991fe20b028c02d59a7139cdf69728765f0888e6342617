const dotenvPrivateKeyNames = require('./../dotenvPrivateKeyNames')
const guessPrivateKeyFilename = require('./../guessPrivateKeyFilename')

const TYPE_ENV_FILE = 'envFile'
const DEFAULT_ENVS = [{ type: TYPE_ENV_FILE, value: '.env' }]

function envsFromDotenvPrivateKey (privateKeyNames) {
  const envs = []

  for (const privateKeyName of privateKeyNames) {
    const filename = guessPrivateKeyFilename(privateKeyName)
    envs.push({ type: TYPE_ENV_FILE, value: filename })
  }

  return envs
}

function determine (envs = [], processEnv) {
  const privateKeyNames = dotenvPrivateKeyNames(processEnv)
  if (!envs || envs.length <= 0) {
    // if process.env.DOTENV_PRIVATE_KEY or process.env.DOTENV_PRIVATE_KEY_${environment} is set, assume inline encryption methodology
    if (privateKeyNames.length > 0) {
      return envsFromDotenvPrivateKey(privateKeyNames)
    }

    return DEFAULT_ENVS // default to .env file expectation
  } else {
    let fileAlreadySpecified = false

    for (const env of envs) {
      if (env.type === TYPE_ENV_FILE) {
        fileAlreadySpecified = true
      }
    }

    // return early since envs array objects already contain 1 .env file
    if (fileAlreadySpecified) {
      return envs
    }

    // no .env file specified as a flag so default to .env
    return [...DEFAULT_ENVS, ...envs]
  }
}

module.exports = determine
