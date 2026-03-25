const fsx = require('./fsx')
const path = require('path')

const PUBLIC_KEY_SCHEMA = 'DOTENV_PUBLIC_KEY'
const PRIVATE_KEY_SCHEMA = 'DOTENV_PRIVATE_KEY'

const dotenvParse = require('./dotenvParse')
const guessPrivateKeyName = require('./guessPrivateKeyName')

function searchProcessEnv (privateKeyName) {
  if (process.env[privateKeyName] && process.env[privateKeyName].length > 0) {
    return process.env[privateKeyName]
  }
}

function searchKeysFile (privateKeyName, envFilepath, envKeysFilepath = null) {
  let keysFilepath = path.resolve(path.dirname(envFilepath), '.env.keys') // typical scenario
  if (envKeysFilepath) { // user specified -fk flag
    keysFilepath = path.resolve(envKeysFilepath)
  }

  if (fsx.existsSync(keysFilepath)) {
    const keysSrc = fsx.readFileX(keysFilepath)
    const keysParsed = dotenvParse(keysSrc)

    if (keysParsed[privateKeyName] && keysParsed[privateKeyName].length > 0) {
      return keysParsed[privateKeyName]
    }
  }
}

function invertForPrivateKeyName (envFilepath) {
  if (!fsx.existsSync(envFilepath)) {
    return null
  }

  const envSrc = fsx.readFileX(envFilepath)
  const envParsed = dotenvParse(envSrc)

  let publicKeyName
  for (const keyName of Object.keys(envParsed)) {
    if (keyName === PUBLIC_KEY_SCHEMA || keyName.startsWith(PUBLIC_KEY_SCHEMA)) {
      publicKeyName = keyName // find DOTENV_PUBLIC_KEY* in filename
    }
  }

  if (publicKeyName) {
    return publicKeyName.replace(PUBLIC_KEY_SCHEMA, PRIVATE_KEY_SCHEMA) // return inverted (DOTENV_PUBLIC_KEY* -> DOTENV_PRIVATE_KEY*) if found
  }

  return null
}

function smartDotenvPrivateKey (envFilepath, envKeysFilepath = null) {
  let privateKey = null
  let privateKeyName = guessPrivateKeyName(envFilepath) // DOTENV_PRIVATE_KEY_${ENVIRONMENT}

  // 1. attempt process.env first
  privateKey = searchProcessEnv(privateKeyName)
  if (privateKey) {
    return privateKey
  }

  // 2. attempt .env.keys second (path/to/.env.keys)
  privateKey = searchKeysFile(privateKeyName, envFilepath, envKeysFilepath)
  if (privateKey) {
    return privateKey
  }

  // 3. attempt inverting `DOTENV_PUBLIC_KEY*` name inside file (unlocks custom filenames not matching .env.${ENVIRONMENT} pattern)
  privateKeyName = invertForPrivateKeyName(envFilepath)
  if (privateKeyName) {
    // 3.1 attempt process.env first
    privateKey = searchProcessEnv(privateKeyName)
    if (privateKey) {
      return privateKey
    }

    // 3.2. attempt .env.keys second (path/to/.env.keys)
    privateKey = searchKeysFile(privateKeyName, envFilepath, envKeysFilepath)
    if (privateKey) {
      return privateKey
    }
  }

  return null
}

module.exports = smartDotenvPrivateKey
