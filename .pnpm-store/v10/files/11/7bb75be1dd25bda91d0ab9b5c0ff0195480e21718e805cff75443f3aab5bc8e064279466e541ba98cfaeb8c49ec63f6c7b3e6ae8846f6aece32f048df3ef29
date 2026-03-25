const Decoder = require('../../../decoder')
const { failure, createErrorFromCode } = require('../../../error')

/**
 * AddPartitionsToTxn Response (Version: 0) => throttle_time_ms [errors]
 *   throttle_time_ms => INT32
 *   errors => topic [partition_errors]
 *     topic => STRING
 *     partition_errors => partition error_code
 *       partition => INT32
 *       error_code => INT16
 */
const decode = async rawData => {
  const decoder = new Decoder(rawData)
  const throttleTime = decoder.readInt32()
  const errors = await decoder.readArrayAsync(decodeError)

  return {
    throttleTime,
    errors,
  }
}

const decodeError = async decoder => ({
  topic: decoder.readString(),
  partitionErrors: await decoder.readArrayAsync(decodePartitionError),
})

const decodePartitionError = decoder => ({
  partition: decoder.readInt32(),
  errorCode: decoder.readInt16(),
})

const parse = async data => {
  const topicsWithErrors = data.errors
    .map(({ partitionErrors }) => ({
      partitionsWithErrors: partitionErrors.filter(({ errorCode }) => failure(errorCode)),
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
