const Decoder = require('../../../decoder')
const { KafkaJSOffsetOutOfRange } = require('../../../../errors')
const { failure, createErrorFromCode, errorCodes } = require('../../../error')
const MessageSetDecoder = require('../../../messageSet/decoder')

/**
 * Fetch Response (Version: 0) => [responses]
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
  const responses = await decoder.readArrayAsync(decodeResponse)

  return {
    responses,
  }
}

const { code: OFFSET_OUT_OF_RANGE_ERROR_CODE } = errorCodes.find(
  e => e.type === 'OFFSET_OUT_OF_RANGE'
)

const parse = async data => {
  const errors = data.responses.flatMap(({ topicName, partitions }) => {
    return partitions
      .filter(partition => failure(partition.errorCode))
      .map(partition => Object.assign({}, partition, { topic: topicName }))
  })

  if (errors.length > 0) {
    const { errorCode, topic, partition } = errors[0]
    if (errorCode === OFFSET_OUT_OF_RANGE_ERROR_CODE) {
      throw new KafkaJSOffsetOutOfRange(createErrorFromCode(errorCode), { topic, partition })
    }

    throw createErrorFromCode(errorCode)
  }

  return data
}

module.exports = {
  decode,
  parse,
}
