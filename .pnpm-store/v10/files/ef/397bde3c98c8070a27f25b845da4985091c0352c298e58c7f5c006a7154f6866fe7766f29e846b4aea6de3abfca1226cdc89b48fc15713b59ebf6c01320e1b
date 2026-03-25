const dotenv = require('dotenv')

const parseEncryptionKeyFromDotenvKey = require('./parseEncryptionKeyFromDotenvKey')

function decrypt (ciphertext, dotenvKey) {
  const key = parseEncryptionKeyFromDotenvKey(dotenvKey)

  try {
    return dotenv.decrypt(ciphertext, key)
  } catch (e) {
    if (e.code === 'DECRYPTION_FAILED') {
      const error = new Error('[DECRYPTION_FAILED] Unable to decrypt .env.vault with DOTENV_KEY.')
      error.code = 'DECRYPTION_FAILED'
      error.help = '[DECRYPTION_FAILED] Run with debug flag [dotenvx run --debug -- yourcommand] or manually run [echo $DOTENV_KEY] to compare it to the one in .env.keys.'
      error.debug = `[DECRYPTION_FAILED] DOTENV_KEY is ${dotenvKey}`
      throw error
    }

    if (e.code === 'ERR_CRYPTO_INVALID_AUTH_TAG') {
      const error = new Error('[INVALID_CIPHERTEXT] Unable to decrypt what appears to be invalid ciphertext.')
      error.code = 'INVALID_CIPHERTEXT'
      error.help = '[INVALID_CIPHERTEXT] Run with debug flag [dotenvx run --debug -- yourcommand] or manually check .env.vault.'
      error.debug = `[INVALID_CIPHERTEXT] ciphertext is '${ciphertext}'`
      throw error
    }

    throw e
  }
}

module.exports = decrypt
