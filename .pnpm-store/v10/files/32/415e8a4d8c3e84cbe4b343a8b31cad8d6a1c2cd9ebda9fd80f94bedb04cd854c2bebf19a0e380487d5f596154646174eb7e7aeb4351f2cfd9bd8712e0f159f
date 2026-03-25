const Encoder = require('../../../encoder')
const { Fetch: apiKey } = require('../../apiKeys')
const ISOLATION_LEVEL = require('../../../isolationLevel')

/**
 * Fetch Request (Version: 4) => replica_id max_wait_time min_bytes max_bytes isolation_level [topics]
 *   replica_id => INT32
 *   max_wait_time => INT32
 *   min_bytes => INT32
 *   max_bytes => INT32
 *   isolation_level => INT8
 *   topics => topic [partitions]
 *     topic => STRING
 *     partitions => partition fetch_offset max_bytes
 *       partition => INT32
 *       fetch_offset => INT64
 *       max_bytes => INT32
 */

module.exports = ({
  replicaId,
  maxWaitTime,
  minBytes,
  maxBytes,
  topics,
  isolationLevel = ISOLATION_LEVEL.READ_COMMITTED,
}) => ({
  apiKey,
  apiVersion: 4,
  apiName: 'Fetch',
  encode: async () => {
    return new Encoder()
      .writeInt32(replicaId)
      .writeInt32(maxWaitTime)
      .writeInt32(minBytes)
      .writeInt32(maxBytes)
      .writeInt8(isolationLevel)
      .writeArray(topics.map(encodeTopic))
  },
})

const encodeTopic = ({ topic, partitions }) => {
  return new Encoder().writeString(topic).writeArray(partitions.map(encodePartition))
}

const encodePartition = ({ partition, fetchOffset, maxBytes }) => {
  return new Encoder()
    .writeInt32(partition)
    .writeInt64(fetchOffset)
    .writeInt32(maxBytes)
}
