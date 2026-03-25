const { parse, decode: decodeV0 } = require('../v0/response')

/**
 * Starting in version 1, on quota violation, brokers send out responses before throttling.
 * @see https://cwiki.apache.org/confluence/display/KAFKA/KIP-219+-+Improve+quota+communication
 *
 * AddOffsetsToTxn Response (Version: 1) => throttle_time_ms error_code
 *   throttle_time_ms => INT32
 *   error_code => INT16
 */
const decode = async rawData => {
  const decoded = await decodeV0(rawData)

  return {
    ...decoded,
    throttleTime: 0,
    clientSideThrottleTime: decoded.throttleTime,
  }
}

module.exports = {
  decode,
  parse,
}
