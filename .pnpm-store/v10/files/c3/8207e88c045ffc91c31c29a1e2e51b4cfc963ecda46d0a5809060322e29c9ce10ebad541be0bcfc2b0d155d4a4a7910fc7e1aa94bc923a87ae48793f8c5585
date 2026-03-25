function parseEncryptionKeyFromDotenvKey (dotenvKey) {
  // Parse DOTENV_KEY. Format is a URI
  let uri
  try {
    uri = new URL(dotenvKey)
  } catch (e) {
    throw new Error('INVALID_DOTENV_KEY: Incomplete format. It should be a dotenv uri. (dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development)')
  }

  // Get decrypt key
  const key = uri.password
  if (!key) {
    throw new Error('INVALID_DOTENV_KEY: Missing key part')
  }

  return Buffer.from(key.slice(-64), 'hex')
}

module.exports = parseEncryptionKeyFromDotenvKey
