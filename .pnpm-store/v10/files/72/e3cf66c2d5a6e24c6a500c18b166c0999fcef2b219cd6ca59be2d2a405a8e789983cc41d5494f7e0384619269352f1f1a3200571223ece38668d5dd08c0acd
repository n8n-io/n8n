const Decoder = require('../../../decoder')
const { failure, createErrorFromCode } = require('../../../error')

/**
 * OffsetCommit Response (Version: 0) => [responses]
 *   responses => topic [partition_responses]
 *     topic => STRING
 *     partition_responses => partition error_code
 *       partition => INT32
 *       error_code => INT16
 */

const decode = async rawData => {
  const decoder = new Decoder(rawData)
  return {
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

const parse = async data => {
  const partitionsWithError = data.responses.flatMap(response =>
    response.partitions.filter(partition => failure(partition.errorCode))
  )
  const partitionWithError = partitionsWithError[0]
  if (partitionWithError) {
    throw createErrorFromCode(partitionWithError.errorCode)
  }

  return data
}

module.exports = {
  decode,
  parse,
}
