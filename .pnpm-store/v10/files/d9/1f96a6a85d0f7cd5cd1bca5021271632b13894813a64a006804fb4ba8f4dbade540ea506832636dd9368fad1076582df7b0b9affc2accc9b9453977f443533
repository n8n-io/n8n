const ISOLATION_LEVEL = require('../../../isolationLevel')
const requestV5 = require('../v5/request')

/**
 * Fetch Request (Version: 6) => replica_id max_wait_time min_bytes max_bytes isolation_level [topics]
 *   replica_id => INT32
 *   max_wait_time => INT32
 *   min_bytes => INT32
 *   max_bytes => INT32
 *   isolation_level => INT8
 *   topics => topic [partitions]
 *     topic => STRING
 *     partitions => partition fetch_offset log_start_offset partition_max_bytes
 *       partition => INT32
 *       fetch_offset => INT64
 *       log_start_offset => INT64
 *       partition_max_bytes => INT32
 */

module.exports = ({
  replicaId,
  maxWaitTime,
  minBytes,
  maxBytes,
  topics,
  isolationLevel = ISOLATION_LEVEL.READ_COMMITTED,
}) =>
  Object.assign(
    requestV5({
      replicaId,
      maxWaitTime,
      minBytes,
      maxBytes,
      topics,
      isolationLevel,
    }),
    { apiVersion: 6 }
  )
