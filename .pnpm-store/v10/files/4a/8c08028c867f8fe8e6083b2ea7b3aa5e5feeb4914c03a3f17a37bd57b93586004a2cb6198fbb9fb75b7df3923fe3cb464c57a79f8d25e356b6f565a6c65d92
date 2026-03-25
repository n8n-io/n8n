const Encoder = require('../../../encoder')
const { AlterPartitionReassignments: apiKey } = require('../../apiKeys')

/**
 * AlterPartitionReassignments Request (Version: 0) => timeout_ms [topics] TAG_BUFFER
 * timeout_ms => INT32
 * topics => name [partitions] TAG_BUFFER
 *  name => COMPACT_STRING
 *  partitions => partition_index [replicas] TAG_BUFFER
 *    partition_index => INT32
 *    replicas => INT32
 */

module.exports = ({ topics, timeout = 5000 }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'AlterPartitionReassignments',
  encode: async () => {
    return new Encoder()
      .writeUVarIntBytes()
      .writeInt32(timeout)
      .writeUVarIntArray(topics.map(encodeTopics))
      .writeUVarIntBytes()
  },
})

const encodeTopics = ({ topic, partitionAssignment }) => {
  return new Encoder()
    .writeUVarIntString(topic)
    .writeUVarIntArray(partitionAssignment.map(encodePartitionAssignment))
    .writeUVarIntBytes()
}

const encodePartitionAssignment = ({ partition, replicas }) => {
  return new Encoder()
    .writeInt32(partition)
    .writeUVarIntArray(replicas.map(encodeReplicas))
    .writeUVarIntBytes()
}

const encodeReplicas = replica => {
  return new Encoder().writeInt32(replica)
}
