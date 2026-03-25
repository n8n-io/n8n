const Decoder = require('../../../decoder')
const { failure, createErrorFromCode, failIfVersionNotSupported } = require('../../../error')

/**
 * FindCoordinator Response (Version: 1) => throttle_time_ms error_code error_message coordinator
 *   throttle_time_ms => INT32
 *   error_code => INT16
 *   error_message => NULLABLE_STRING
 *   coordinator => node_id host port
 *     node_id => INT32
 *     host => STRING
 *     port => INT32
 */

const decode = async rawData => {
  const decoder = new Decoder(rawData)
  const throttleTime = decoder.readInt32()
  const errorCode = decoder.readInt16()

  failIfVersionNotSupported(errorCode)

  const errorMessage = decoder.readString()
  const coordinator = {
    nodeId: decoder.readInt32(),
    host: decoder.readString(),
    port: decoder.readInt32(),
  }

  return {
    throttleTime,
    errorCode,
    errorMessage,
    coordinator,
  }
}

const parse = async data => {
  if (failure(data.errorCode)) {
    throw createErrorFromCode(data.errorCode)
  }

  return data
}

module.exports = {
  decode,
  parse,
}
