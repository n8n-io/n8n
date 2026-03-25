const requestV3 = require('../v3/request')

/**
 * OffsetFetch Request (Version: 4) => group_id [topics]
 *   group_id => STRING
 *   topics => topic [partitions]
 *     topic => STRING
 *     partitions => partition
 *       partition => INT32
 */

module.exports = ({ groupId, topics }) =>
  Object.assign(requestV3({ groupId, topics }), { apiVersion: 4 })
