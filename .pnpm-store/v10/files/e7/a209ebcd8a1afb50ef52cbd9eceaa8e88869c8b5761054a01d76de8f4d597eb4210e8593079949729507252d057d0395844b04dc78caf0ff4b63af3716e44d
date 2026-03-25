const Decoder = require('../../../decoder')
const { failIfVersionNotSupported } = require('../../../error')
const { parse: parseV0 } = require('../v0/response')

/**
 * SyncGroup Response (Version: 1) => throttle_time_ms error_code member_assignment
 *   throttle_time_ms => INT32
 *   error_code => INT16
 *   member_assignment => BYTES
 */

const decode = async rawData => {
  const decoder = new Decoder(rawData)
  const throttleTime = decoder.readInt32()
  const errorCode = decoder.readInt16()

  failIfVersionNotSupported(errorCode)

  return {
    throttleTime,
    errorCode,
    memberAssignment: decoder.readBytes(),
  }
}

module.exports = {
  decode,
  parse: parseV0,
}
