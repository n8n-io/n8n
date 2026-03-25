const Encoder = require('../../../encoder')
const { ListPartitionReassignments: apiKey } = require('../../apiKeys')

/**
 * ListPartitionReassignments Request (Version: 0) => timeout_ms [topics] TAG_BUFFER
 *  timeout_ms => INT32
 *  topics => name [partition_indexes] TAG_BUFFER
 *    name => COMPACT_STRING
 *    partition_indexes => INT32
 */

module.exports = ({ topics = null, timeout = 5000 }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'ListPartitionReassignments',
  encode: async () => {
    return new Encoder()
      .writeUVarIntBytes()
      .writeInt32(timeout)
      .writeUVarIntArray(topics === null ? topics : topics.map(encodeTopics))
      .writeUVarIntBytes()
  },
})

const encodeTopics = ({ topic, partitions }) => {
  return new Encoder()
    .writeUVarIntString(topic)
    .writeUVarIntArray(partitions.map(encodePartitions))
    .writeUVarIntBytes()
}

const encodePartitions = partition => {
  return new Encoder().writeInt32(partition)
}
