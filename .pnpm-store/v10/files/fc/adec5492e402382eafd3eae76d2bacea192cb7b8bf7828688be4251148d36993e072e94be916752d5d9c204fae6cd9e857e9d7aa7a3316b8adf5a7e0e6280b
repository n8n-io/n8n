const {
  KafkaJSAggregateError,
  KafkaJSAlterPartitionReassignmentsError,
} = require('../../../../errors')
const Decoder = require('../../../decoder')
const { failure, createErrorFromCode } = require('../../../error')

/**
 * AlterPartitionReassignments Response (Version: 0) => throttle_time_ms error_code error_message [responses] TAG_BUFFER
 * throttle_time_ms => INT32
 * error_code => INT16
 * error_message => COMPACT_NULLABLE_STRING
 * responses => name [partitions] TAG_BUFFER
 *  name => COMPACT_STRING
 *  partitions => partition_index error_code error_message TAG_BUFFER
 *    partition_index => INT32
 *    error_code => INT16
 *    error_message => COMPACT_NULLABLE_STRING
 */

const decodeResponses = decoder => {
  const response = {
    topic: decoder.readUVarIntString(),
    partitions: decoder.readUVarIntArray(decodePartitions),
  }

  decoder.readTaggedFields()
  return response
}

const decodePartitions = decoder => {
  const partition = {
    partition: decoder.readInt32(),
    errorCode: decoder.readInt16(),
  }
  decoder.readUVarIntString()
  decoder.readTaggedFields()
  return partition
}

const decode = async rawData => {
  const decoder = new Decoder(rawData)
  decoder.readTaggedFields()
  const throttleTime = decoder.readInt32()
  const errorCode = decoder.readInt16()
  decoder.readUVarIntString()
  return {
    throttleTime,
    errorCode,
    responses: decoder.readUVarIntArray(decodeResponses),
  }
}

const parse = async data => {
  if (failure(data.errorCode)) {
    throw new KafkaJSAlterPartitionReassignmentsError(createErrorFromCode(data.errorCode))
  }

  const topicPartitionsWithError = data.responses.flatMap(({ partitions, topic }) =>
    partitions
      .filter(partition => failure(partition.errorCode))
      .map(partition => ({
        ...partition,
        topic,
      }))
  )

  if (topicPartitionsWithError.length > 0) {
    throw new KafkaJSAggregateError(
      'Errors altering partition reassignments',
      topicPartitionsWithError.map(
        ({ topic, partition, errorCode }) =>
          new KafkaJSAlterPartitionReassignmentsError(
            createErrorFromCode(errorCode),
            topic,
            partition
          )
      )
    )
  }

  return data
}

module.exports = {
  decode,
  parse,
}
