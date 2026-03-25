const { requests, lookup } = require('../../protocol/requests')
const apiKeys = require('../../protocol/requests/apiKeys')
const plainAuthenticatorProvider = require('./plain')
const scram256AuthenticatorProvider = require('./scram256')
const scram512AuthenticatorProvider = require('./scram512')
const awsIAMAuthenticatorProvider = require('./awsIam')
const oauthBearerAuthenticatorProvider = require('./oauthBearer')
const { KafkaJSSASLAuthenticationError } = require('../../errors')

const BUILT_IN_AUTHENTICATION_PROVIDERS = {
  AWS: awsIAMAuthenticatorProvider,
  PLAIN: plainAuthenticatorProvider,
  OAUTHBEARER: oauthBearerAuthenticatorProvider,
  'SCRAM-SHA-256': scram256AuthenticatorProvider,
  'SCRAM-SHA-512': scram512AuthenticatorProvider,
}

const UNLIMITED_SESSION_LIFETIME = '0'

module.exports = class SASLAuthenticator {
  constructor(connection, logger, versions, supportAuthenticationProtocol) {
    this.connection = connection
    this.logger = logger
    this.sessionLifetime = UNLIMITED_SESSION_LIFETIME

    const lookupRequest = lookup(versions)
    this.saslHandshake = lookupRequest(apiKeys.SaslHandshake, requests.SaslHandshake)
    this.protocolAuthentication = supportAuthenticationProtocol
      ? lookupRequest(apiKeys.SaslAuthenticate, requests.SaslAuthenticate)
      : null
  }

  async authenticate() {
    const mechanism = this.connection.sasl.mechanism.toUpperCase()
    const handshake = await this.connection.send(this.saslHandshake({ mechanism }))
    if (!handshake.enabledMechanisms.includes(mechanism)) {
      throw new KafkaJSSASLAuthenticationError(
        `SASL ${mechanism} mechanism is not supported by the server`
      )
    }

    const saslAuthenticate = async ({ request, response }) => {
      if (this.protocolAuthentication) {
        const requestAuthBytes = await request.encode()
        const authResponse = await this.connection.send(
          this.protocolAuthentication({ authBytes: requestAuthBytes })
        )

        // `0` is a string because `sessionLifetimeMs` is an int64 encoded as string.
        // This is not present in SaslAuthenticateV0, so we default to `"0"`
        this.sessionLifetime = authResponse.sessionLifetimeMs || UNLIMITED_SESSION_LIFETIME

        if (!response) {
          return
        }

        const { authBytes: responseAuthBytes } = authResponse
        const payloadDecoded = await response.decode(responseAuthBytes)
        return response.parse(payloadDecoded)
      }

      return this.connection.sendAuthRequest({ request, response })
    }

    if (
      !this.connection.sasl.authenticationProvider &&
      Object.keys(BUILT_IN_AUTHENTICATION_PROVIDERS).includes(mechanism)
    ) {
      this.connection.sasl.authenticationProvider = BUILT_IN_AUTHENTICATION_PROVIDERS[mechanism](
        this.connection.sasl
      )
    }
    await this.connection.sasl
      .authenticationProvider({
        host: this.connection.host,
        port: this.connection.port,
        logger: this.logger.namespace(`SaslAuthenticator-${mechanism}`),
        saslAuthenticate,
      })
      .authenticate()
  }
}
