const requestV0 = require('../v0/request')

/**
 * DeleteRecords Request (Version: 1) => [topics] timeout_ms
 *   topics => topic [partitions]
 *     topic => STRING
 *     partitions => partition offset
 *       partition => INT32
 *       offset => INT64
 *   timeout => INT32
 */
module.exports = ({ topics, timeout }) =>
  Object.assign(requestV0({ topics, timeout }), { apiVersion: 1 })
