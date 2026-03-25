const Encoder = require('../../../encoder')
const { ListOffsets: apiKey } = require('../../apiKeys')

/**
 * ListOffsets Request (Version: 2) => replica_id isolation_level [topics]
 *   replica_id => INT32
 *   isolation_level => INT8
 *   topics => topic [partitions]
 *     topic => STRING
 *     partitions => partition timestamp
 *       partition => INT32
 *       timestamp => INT64
 */
module.exports = ({ replicaId, isolationLevel, topics }) => ({
  apiKey,
  apiVersion: 2,
  apiName: 'ListOffsets',
  encode: async () => {
    return new Encoder()
      .writeInt32(replicaId)
      .writeInt8(isolationLevel)
      .writeArray(topics.map(encodeTopic))
  },
})

const encodeTopic = ({ topic, partitions }) => {
  return new Encoder().writeString(topic).writeArray(partitions.map(encodePartition))
}

const encodePartition = ({ partition, timestamp = -1 }) => {
  return new Encoder().writeInt32(partition).writeInt64(timestamp)
}
