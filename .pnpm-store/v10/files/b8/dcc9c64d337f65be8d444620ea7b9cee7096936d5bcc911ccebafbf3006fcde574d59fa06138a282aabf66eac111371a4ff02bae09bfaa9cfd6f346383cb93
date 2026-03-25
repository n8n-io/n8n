const Decoder = require('../../../decoder')
const Encoder = require('../../../encoder')
const {
  failure,
  createErrorFromCode,
  failIfVersionNotSupported,
  errorCodes,
} = require('../../../error')

const { KafkaJSProtocolError } = require('../../../../errors')
const SASL_AUTHENTICATION_FAILED = 58
const protocolAuthError = errorCodes.find(e => e.code === SASL_AUTHENTICATION_FAILED)

/**
 * SaslAuthenticate Response (Version: 0) => error_code error_message sasl_auth_bytes
 *   error_code => INT16
 *   error_message => NULLABLE_STRING
 *   sasl_auth_bytes => BYTES
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

  return {
    errorCode,
    errorMessage,
    authBytes,
  }
}

const parse = async data => {
  if (data.errorCode === SASL_AUTHENTICATION_FAILED && data.errorMessage) {
    throw new KafkaJSProtocolError({
      ...protocolAuthError,
      message: data.errorMessage,
    })
  }

  if (failure(data.errorCode)) {
    throw createErrorFromCode(data.errorCode)
  }

  return data
}

module.exports = {
  decode,
  parse,
}
