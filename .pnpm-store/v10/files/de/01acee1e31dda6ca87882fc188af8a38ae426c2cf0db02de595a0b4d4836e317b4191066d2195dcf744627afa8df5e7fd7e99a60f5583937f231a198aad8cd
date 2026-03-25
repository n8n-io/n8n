const Decoder = require('../../../decoder')
const { failure, createErrorFromCode } = require('../../../error')

/**
 * OffsetFetch Response (Version: 2) => [responses] error_code
 *   responses => topic [partition_responses]
 *     topic => STRING
 *     partition_responses => partition offset metadata error_code
 *       partition => INT32
 *       offset => INT64
 *       metadata => NULLABLE_STRING
 *       error_code => INT16
 *   error_code => INT16
 */

const decode = async rawData => {
  const decoder = new Decoder(rawData)
  return {
    responses: decoder.readArray(decodeResponses),
    errorCode: decoder.readInt16(),
  }
}

const decodeResponses = decoder => ({
  topic: decoder.readString(),
  partitions: decoder.readArray(decodePartitions),
})

const decodePartitions = decoder => ({
  partition: decoder.readInt32(),
  offset: decoder.readInt64().toString(),
  metadata: decoder.readString(),
  errorCode: decoder.readInt16(),
})

const parse = async data => {
  if (failure(data.errorCode)) {
    throw createErrorFromCode(data.errorCode)
  }

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
