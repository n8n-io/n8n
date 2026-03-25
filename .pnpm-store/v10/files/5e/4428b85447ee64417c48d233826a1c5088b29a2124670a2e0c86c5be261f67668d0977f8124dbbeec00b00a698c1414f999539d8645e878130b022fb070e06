const ISOLATION_LEVEL = require('../../../isolationLevel')
const requestV9 = require('../v9/request')

/**
 * ZStd Compression
 * @see https://cwiki.apache.org/confluence/display/KAFKA/KIP-110%3A+Add+Codec+for+ZStandard+Compression
 */

/**
 * Fetch Request (Version: 10) => replica_id max_wait_time min_bytes max_bytes isolation_level session_id session_epoch [topics] [forgotten_topics_data]
 *   replica_id => INT32
 *   max_wait_time => INT32
 *   min_bytes => INT32
 *   max_bytes => INT32
 *   isolation_level => INT8
 *   session_id => INT32
 *   session_epoch => INT32
 *   topics => topic [partitions]
 *     topic => STRING
 *     partitions => partition current_leader_epoch fetch_offset log_start_offset partition_max_bytes
 *       partition => INT32
 *       current_leader_epoch => INT32
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
}) =>
  Object.assign(
    requestV9({
      replicaId,
      maxWaitTime,
      minBytes,
      maxBytes,
      topics,
      isolationLevel,
      sessionId,
      sessionEpoch,
      forgottenTopics,
    }),
    { apiVersion: 10 }
  )
