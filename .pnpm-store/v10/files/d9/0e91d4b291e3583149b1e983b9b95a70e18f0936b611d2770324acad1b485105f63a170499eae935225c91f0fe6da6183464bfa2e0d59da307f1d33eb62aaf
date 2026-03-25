const Decoder = require('../../../decoder')
const { parse: parseV0 } = require('../v0/response')

/**
 * OffsetCommit Response (Version: 3) => throttle_time_ms [responses]
 *   throttle_time_ms => INT32
 *   responses => topic [partition_responses]
 *     topic => STRING
 *     partition_responses => partition error_code
 *       partition => INT32
 *       error_code => INT16
 */

const decode = async rawData => {
  const decoder = new Decoder(rawData)
  return {
    throttleTime: decoder.readInt32(),
    responses: decoder.readArray(decodeResponses),
  }
}

const decodeResponses = decoder => ({
  topic: decoder.readString(),
  partitions: decoder.readArray(decodePartitions),
})

const decodePartitions = decoder => ({
  partition: decoder.readInt32(),
  errorCode: decoder.readInt16(),
})

module.exports = {
  decode,
  parse: parseV0,
}
