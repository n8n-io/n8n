const { parse, decode: decodeV1 } = require('../v1/response')

/**
 * Starting in version 2, on quota violation, brokers send out responses before throttling.
 * @see https://cwiki.apache.org/confluence/display/KAFKA/KIP-219+-+Improve+quota+communication
 *
 * ApiVersions Response (Version: 2) => error_code [api_versions] throttle_time_ms
 *   error_code => INT16
 *   api_versions => api_key min_version max_version
 *     api_key => INT16
 *     min_version => INT16
 *     max_version => INT16
 *   throttle_time_ms => INT32
 */

const decode = async rawData => {
  const decoded = await decodeV1(rawData)

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
