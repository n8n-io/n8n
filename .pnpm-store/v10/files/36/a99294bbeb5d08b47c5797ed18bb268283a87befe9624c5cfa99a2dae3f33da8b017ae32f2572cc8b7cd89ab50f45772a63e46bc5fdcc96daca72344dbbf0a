const { request, response } = require('../../protocol/sasl/awsIam')
const { KafkaJSSASLAuthenticationError } = require('../../errors')

const awsIAMAuthenticatorProvider = sasl => ({ host, port, logger, saslAuthenticate }) => {
  return {
    authenticate: async () => {
      if (!sasl.authorizationIdentity) {
        throw new KafkaJSSASLAuthenticationError('SASL AWS-IAM: Missing authorizationIdentity')
      }
      if (!sasl.accessKeyId) {
        throw new KafkaJSSASLAuthenticationError('SASL AWS-IAM: Missing accessKeyId')
      }
      if (!sasl.secretAccessKey) {
        throw new KafkaJSSASLAuthenticationError('SASL AWS-IAM: Missing secretAccessKey')
      }
      if (!sasl.sessionToken) {
        sasl.sessionToken = ''
      }

      const broker = `${host}:${port}`

      try {
        logger.debug('Authenticate with SASL AWS-IAM', { broker })
        await saslAuthenticate({ request: request(sasl), response })
        logger.debug('SASL AWS-IAM authentication successful', { broker })
      } catch (e) {
        const error = new KafkaJSSASLAuthenticationError(
          `SASL AWS-IAM authentication failed: ${e.message}`
        )
        logger.error(error.message, { broker })
        throw error
      }
    },
  }
}

module.exports = awsIAMAuthenticatorProvider
