const responseV0 = require('../v0/response')

/**
 * Starting in version 1, on quota violation, brokers send out responses before throttling.
 * @see https://cwiki.apache.org/confluence/display/KAFKA/KIP-219+-+Improve+quota+communication
 *
 * DeleteRecords Response (Version: 1) => throttle_time_ms [topics]
 *  throttle_time_ms => INT32
 *  topics => name [partitions]
 *    name => STRING
 *    partitions => partition_index low_watermark error_code
 *      partition_index => INT32
 *      low_watermark => INT64
 *      error_code => INT16
 */

module.exports = ({ topics }) => {
  const { parse, decode: decodeV0 } = responseV0({ topics })

  const decode = async rawData => {
    const decoded = await decodeV0(rawData)

    return {
      ...decoded,
      throttleTime: 0,
      clientSideThrottleTime: decoded.throttleTime,
    }
  }

  return {
    decode,
    parse,
  }
}
