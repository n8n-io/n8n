const Encoder = require('../../../encoder')
const { CreatePartitions: apiKey } = require('../../apiKeys')

/**
 * CreatePartitions Request (Version: 0) => [topic_partitions] timeout validate_only
 *   topic_partitions => topic new_partitions
 *     topic => STRING
 *     new_partitions => count [assignment]
 *       count => INT32
 *       assignment => ARRAY(INT32)
 *   timeout => INT32
 *   validate_only => BOOLEAN
 */

module.exports = ({ topicPartitions, validateOnly = false, timeout = 5000 }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'CreatePartitions',
  encode: async () => {
    return new Encoder()
      .writeArray(topicPartitions.map(encodeTopicPartitions))
      .writeInt32(timeout)
      .writeBoolean(validateOnly)
  },
})

const encodeTopicPartitions = ({ topic, count, assignments = [] }) => {
  return new Encoder()
    .writeString(topic)
    .writeInt32(count)
    .writeNullableArray(assignments.map(encodeAssignments))
}

const encodeAssignments = brokerIds => {
  return new Encoder().writeNullableArray(brokerIds)
}
