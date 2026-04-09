const path = require('path')

const fsx = require('./../fsx')
const dotenvParse = require('./../dotenvParse')
const keyNames = require('./keyNames')
const readProcessKey = require('./readProcessKey')
const readFileKey = require('./readFileKey')
const opsKeypair = require('../cryptography/opsKeypair')

function invertForPrivateKeyName (filepath) {
  const PUBLIC_KEY_SCHEMA = 'DOTENV_PUBLIC_KEY'
  const PRIVATE_KEY_SCHEMA = 'DOTENV_PRIVATE_KEY'

  if (!fsx.existsSync(filepath)) {
    return null
  }

  const envSrc = fsx.readFileX(filepath)
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

function keyValues (filepath, opts = {}) {
  let keysFilepath = opts.keysFilepath || null
  const opsOn = opts.opsOn === true
  const names = keyNames(filepath)
  const publicKeyName = names.publicKeyName // DOTENV_PUBLIC_KEY_${ENVIRONMENT}
  let privateKeyName = names.privateKeyName // DOTENV_PRIVATE_KEY_${ENVIRONMENT}

  let publicKey = null
  let privateKey = null

  // public key: process.env first, then .env*
  publicKey = readProcessKey(publicKeyName)
  if (!publicKey) {
    publicKey = readFileKey(publicKeyName, filepath) || null
  }

  // private key: process.env first, then .env.keys, then invert public key
  privateKey = readProcessKey(privateKeyName)
  if (!privateKey) {
    if (keysFilepath) { // user specified -fk flag
      keysFilepath = path.resolve(keysFilepath)
    } else {
      keysFilepath = path.resolve(path.dirname(filepath), '.env.keys') // typical scenario
    }

    privateKey = readFileKey(privateKeyName, keysFilepath)
  }
  // invert
  if (!privateKey) {
    privateKeyName = invertForPrivateKeyName(filepath)
    if (privateKeyName) {
      privateKey = readProcessKey(privateKeyName)
      if (!privateKey) {
        privateKey = readFileKey(privateKeyName, keysFilepath)
      }
    }
  }

  // ops
  if (opsOn && !privateKey && publicKey && publicKey.length > 0) {
    const kp = opsKeypair(publicKey)
    privateKey = kp.privateKey
  }

  return {
    publicKeyValue: publicKey || null, // important to make sure name is rendered
    privateKeyValue: privateKey || null // importan to make sure name is rendered
  }
}

module.exports = keyValues
