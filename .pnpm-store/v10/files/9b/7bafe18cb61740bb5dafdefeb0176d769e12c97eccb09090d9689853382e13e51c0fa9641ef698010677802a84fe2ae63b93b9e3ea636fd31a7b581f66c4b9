const PREFIX = 'DOTENV_PRIVATE_KEY'

function guessPrivateKeyFilename (privateKeyName) {
  // .env
  if (privateKeyName === PREFIX) {
    return '.env'
  }

  const filenameSuffix = privateKeyName.substring(`${PREFIX}_`.length).split('_').join('.').toLowerCase()
  // .env.ENVIRONMENT

  return `.env.${filenameSuffix}`
}

module.exports = guessPrivateKeyFilename
