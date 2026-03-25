const Decoder = require('../../../decoder')
const { failure, createErrorFromCode } = require('../../../error')

/**
 * TxnOffsetCommit Response (Version: 0) => throttle_time_ms [topics]
 *   throttle_time_ms => INT32
 *   topics => topic [partitions]
 *     topic => STRING
 *     partitions => partition error_code
 *       partition => INT32
 *       error_code => INT16
 */
const decode = async rawData => {
  const decoder = new Decoder(rawData)
  const throttleTime = decoder.readInt32()
  const topics = await decoder.readArrayAsync(decodeTopic)

  return {
    throttleTime,
    topics,
  }
}

const decodeTopic = async decoder => ({
  topic: decoder.readString(),
  partitions: await decoder.readArrayAsync(decodePartition),
})

const decodePartition = decoder => ({
  partition: decoder.readInt32(),
  errorCode: decoder.readInt16(),
})

const parse = async data => {
  const topicsWithErrors = data.topics
    .map(({ partitions }) => ({
      partitionsWithErrors: partitions.filter(({ errorCode }) => failure(errorCode)),
    }))
    .filter(({ partitionsWithErrors }) => partitionsWithErrors.length)

  if (topicsWithErrors.length > 0) {
    throw createErrorFromCode(topicsWithErrors[0].partitionsWithErrors[0].errorCode)
  }

  return data
}

module.exports = {
  decode,
  parse,
}
