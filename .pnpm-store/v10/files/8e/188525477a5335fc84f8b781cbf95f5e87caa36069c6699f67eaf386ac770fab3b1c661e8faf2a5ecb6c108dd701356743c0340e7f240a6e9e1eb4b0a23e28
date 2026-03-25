const requestV0 = require('../v0/request')

/**
 * SaslAuthenticate Request (Version: 1) => sasl_auth_bytes
 *   sasl_auth_bytes => BYTES
 */

/**
 * @param {Buffer} authBytes - SASL authentication bytes from client as defined by the SASL mechanism
 */
module.exports = ({ authBytes }) => Object.assign(requestV0({ authBytes }), { apiVersion: 1 })
