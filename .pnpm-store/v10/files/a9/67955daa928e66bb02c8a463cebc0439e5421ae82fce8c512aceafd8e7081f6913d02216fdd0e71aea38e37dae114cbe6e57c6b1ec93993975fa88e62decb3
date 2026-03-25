const Decoder = require('../../../decoder')
const { failure, createErrorFromCode, failIfVersionNotSupported } = require('../../../error')

/**
 * FindCoordinator Response (Version: 0) => error_code coordinator
 *  error_code => INT16
 *  coordinator => node_id host port
 *    node_id => INT32
 *    host => STRING
 *    port => INT32
 */

const decode = async rawData => {
  const decoder = new Decoder(rawData)
  const errorCode = decoder.readInt16()

  failIfVersionNotSupported(errorCode)

  const coordinator = {
    nodeId: decoder.readInt32(),
    host: decoder.readString(),
    port: decoder.readInt32(),
  }

  return {
    errorCode,
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
