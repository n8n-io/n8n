const Decoder = require('../../../decoder')
const { parse: parseV0 } = require('../v0/response')
const MessageSetDecoder = require('../../../messageSet/decoder')

/**
 * Fetch Response (Version: 1) => throttle_time_ms [responses]
 *   throttle_time_ms => INT32
 *   responses => topic [partition_responses]
 *     topic => STRING
 *     partition_responses => partition_header record_set
 *       partition_header => partition error_code high_watermark
 *         partition => INT32
 *         error_code => INT16
 *         high_watermark => INT64
 *       record_set => RECORDS
 */

const decodePartition = async decoder => ({
  partition: decoder.readInt32(),
  errorCode: decoder.readInt16(),
  highWatermark: decoder.readInt64().toString(),
  messages: await MessageSetDecoder(decoder),
})

const decodeResponse = async decoder => ({
  topicName: decoder.readString(),
  partitions: await decoder.readArrayAsync(decodePartition),
})

const decode = async rawData => {
  const decoder = new Decoder(rawData)
  const throttleTime = decoder.readInt32()
  const responses = await decoder.readArrayAsync(decodeResponse)

  return {
    throttleTime,
    responses,
  }
}

module.exports = {
  decode,
  parse: parseV0,
}
