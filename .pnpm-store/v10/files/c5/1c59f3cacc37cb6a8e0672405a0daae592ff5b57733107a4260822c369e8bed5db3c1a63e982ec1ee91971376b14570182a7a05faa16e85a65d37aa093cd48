const Encoder = require('../../encoder')

const US_ASCII_NULL_CHAR = '\u0000'

module.exports = ({ authorizationIdentity, accessKeyId, secretAccessKey, sessionToken = '' }) => ({
  encode: async () => {
    return new Encoder().writeBytes(
      [authorizationIdentity, accessKeyId, secretAccessKey, sessionToken].join(US_ASCII_NULL_CHAR)
    ).buffer
  },
})
