const requestV1 = require('../v1/request')

/**
 * OffsetFetch Request (Version: 2) => group_id [topics]
 *   group_id => STRING
 *   topics => topic [partitions]
 *     topic => STRING
 *     partitions => partition
 *       partition => INT32
 */

module.exports = ({ groupId, topics }) =>
  Object.assign(requestV1({ groupId, topics }), { apiVersion: 2 })
