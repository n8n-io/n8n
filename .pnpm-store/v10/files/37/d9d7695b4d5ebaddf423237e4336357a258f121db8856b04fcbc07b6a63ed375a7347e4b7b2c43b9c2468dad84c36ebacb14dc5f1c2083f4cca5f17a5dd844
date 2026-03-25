const Decoder = require('../../../decoder')
const { failure, createErrorFromCode } = require('../../../error')

/**
 * v0
 * ProduceResponse => [TopicName [Partition ErrorCode Offset]]
 *   TopicName => string
 *   Partition => int32
 *   ErrorCode => int16
 *   Offset => int64
 */

const partition = decoder => ({
  partition: decoder.readInt32(),
  errorCode: decoder.readInt16(),
  offset: decoder.readInt64().toString(),
})

const decode = async rawData => {
  const decoder = new Decoder(rawData)
  const topics = decoder.readArray(decoder => ({
    topicName: decoder.readString(),
    partitions: decoder.readArray(partition),
  }))

  return {
    topics,
  }
}

const parse = async data => {
  const errors = data.topics.flatMap(topic => {
    return topic.partitions.filter(partition => failure(partition.errorCode))
  })

  if (errors.length > 0) {
    const { errorCode } = errors[0]
    throw createErrorFromCode(errorCode)
  }

  return data
}

module.exports = {
  decode,
  parse,
}
