const { SCRAM, DIGESTS } = require('./scram')

const scram256AuthenticatorProvider = sasl => ({ host, port, logger, saslAuthenticate }) => {
  const scram = new SCRAM(sasl, host, port, logger, saslAuthenticate, DIGESTS.SHA256)
  return {
    authenticate: async () => await scram.authenticate(),
  }
}

module.exports = scram256AuthenticatorProvider
