const { SCRAM, DIGESTS } = require('./scram')

const scram512AuthenticatorProvider = sasl => ({ host, port, logger, saslAuthenticate }) => {
  const scram = new SCRAM(sasl, host, port, logger, saslAuthenticate, DIGESTS.SHA512)
  return {
    authenticate: async () => await scram.authenticate(),
  }
}

module.exports = scram512AuthenticatorProvider
