const { logger } = require('./../../shared/logger')

class DeprecationNotice {
  constructor (options = {}) {
    this.DOTENV_KEY = options.DOTENV_KEY || process.env.DOTENV_KEY
  }

  dotenvKey () {
    if (this.DOTENV_KEY) {
      logger.warn('[DEPRECATION NOTICE] Setting DOTENV_KEY with .env.vault is deprecated.')
      logger.warn('[DEPRECATION NOTICE] Run [dotenvx ext vault migrate] for instructions on converting your .env.vault file to encrypted .env files (using public key encryption algorithm secp256k1)')
      logger.warn('[DEPRECATION NOTICE] Read more at [https://github.com/dotenvx/dotenvx/blob/main/CHANGELOG.md#0380]')
    }
  }
}

module.exports = DeprecationNotice
