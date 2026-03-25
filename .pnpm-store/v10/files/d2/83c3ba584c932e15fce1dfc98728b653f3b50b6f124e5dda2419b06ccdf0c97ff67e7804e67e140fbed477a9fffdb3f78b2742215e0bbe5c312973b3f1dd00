const requestV2 = require('../v2/request')

/**
 * ListOffsets Request (Version: 3) => replica_id isolation_level [topics]
 *   replica_id => INT32
 *   isolation_level => INT8
 *   topics => topic [partitions]
 *     topic => STRING
 *     partitions => partition timestamp
 *       partition => INT32
 *       timestamp => INT64
 */
module.exports = ({ replicaId, isolationLevel, topics }) =>
  Object.assign(requestV2({ replicaId, isolationLevel, topics }), { apiVersion: 3 })
