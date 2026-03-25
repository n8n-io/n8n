const Encoder = require('../../../encoder')
const { SaslAuthenticate: apiKey } = require('../../apiKeys')

/**
 * SaslAuthenticate Request (Version: 0) => sasl_auth_bytes
 *   sasl_auth_bytes => BYTES
 */

/**
 * @param {Buffer} authBytes - SASL authentication bytes from client as defined by the SASL mechanism
 */
module.exports = ({ authBytes }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'SaslAuthenticate',
  encode: async () => {
    return new Encoder().writeBuffer(authBytes)
  },
})
