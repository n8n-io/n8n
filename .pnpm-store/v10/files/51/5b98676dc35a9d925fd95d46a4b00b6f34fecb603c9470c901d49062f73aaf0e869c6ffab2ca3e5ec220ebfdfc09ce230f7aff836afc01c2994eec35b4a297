const Decoder = require('../../../decoder')
const Encoder = require('../../../encoder')
const { parse: parseV0 } = require('../v0/response')
const { failIfVersionNotSupported } = require('../../../error')

/**
 * SaslAuthenticate Response (Version: 1) => error_code error_message sasl_auth_bytes
 *   error_code => INT16
 *   error_message => NULLABLE_STRING
 *   sasl_auth_bytes => BYTES
 *   session_lifetime_ms => INT64
 */
const decode = async rawData => {
  const decoder = new Decoder(rawData)
  const errorCode = decoder.readInt16()

  failIfVersionNotSupported(errorCode)
  const errorMessage = decoder.readString()

  // This is necessary to make the response compatible with the original
  // mechanism protocols. They expect a byte response, which starts with
  // the size
  const authBytesEncoder = new Encoder().writeBytes(decoder.readBytes())
  const authBytes = authBytesEncoder.buffer
  const sessionLifetimeMs = decoder.readInt64().toString()

  return {
    errorCode,
    errorMessage,
    authBytes,
    sessionLifetimeMs,
  }
}
module.exports = {
  decode,
  parse: parseV0,
}
