const Encoder = require('../../../encoder')
const { Fetch: apiKey } = require('../../apiKeys')
const ISOLATION_LEVEL = require('../../../isolationLevel')

/**
 * Sessions are only used by followers
 * @see https://cwiki.apache.org/confluence/display/KAFKA/KIP-227%3A+Introduce+Incremental+FetchRequests+to+Increase+Partition+Scalability
 */

/**
 * Fetch Request (Version: 7) => replica_id max_wait_time min_bytes max_bytes isolation_level session_id session_epoch [topics] [forgotten_topics_data]
 *   replica_id => INT32
 *   max_wait_time => INT32
 *   min_bytes => INT32
 *   max_bytes => INT32
 *   isolation_level => INT8
 *   session_id => INT32
 *   session_epoch => INT32
 *   topics => topic [partitions]
 *     topic => STRING
 *     partitions => partition fetch_offset log_start_offset partition_max_bytes
 *       partition => INT32
 *       fetch_offset => INT64
 *       log_start_offset => INT64
 *       partition_max_bytes => INT32
 *   forgotten_topics_data => topic [partitions]
 *     topic => STRING
 *     partitions => INT32
 */

module.exports = ({
  replicaId,
  maxWaitTime,
  minBytes,
  maxBytes,
  topics,
  isolationLevel = ISOLATION_LEVEL.READ_COMMITTED,
  sessionId = 0,
  sessionEpoch = -1,
  forgottenTopics = [], // Topics to remove from the fetch session
}) => ({
  apiKey,
  apiVersion: 7,
  apiName: 'Fetch',
  encode: async () => {
    return new Encoder()
      .writeInt32(replicaId)
      .writeInt32(maxWaitTime)
      .writeInt32(minBytes)
      .writeInt32(maxBytes)
      .writeInt8(isolationLevel)
      .writeInt32(sessionId)
      .writeInt32(sessionEpoch)
      .writeArray(topics.map(encodeTopic))
      .writeArray(forgottenTopics.map(encodeForgottenTopics))
  },
})

const encodeForgottenTopics = ({ topic, partitions }) => {
  return new Encoder().writeString(topic).writeArray(partitions)
}

const encodeTopic = ({ topic, partitions }) => {
  return new Encoder().writeString(topic).writeArray(partitions.map(encodePartition))
}

const encodePartition = ({ partition, fetchOffset, logStartOffset = -1, maxBytes }) => {
  return new Encoder()
    .writeInt32(partition)
    .writeInt64(fetchOffset)
    .writeInt64(logStartOffset)
    .writeInt32(maxBytes)
}
