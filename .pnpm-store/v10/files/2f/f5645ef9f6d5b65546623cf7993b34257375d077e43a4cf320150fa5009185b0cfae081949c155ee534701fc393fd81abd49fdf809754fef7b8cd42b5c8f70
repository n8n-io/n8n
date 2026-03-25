const requestV1 = require('../v1/request')

/**
 * Heartbeat Request (Version: 2) => group_id generation_id member_id
 *   group_id => STRING
 *   generation_id => INT32
 *   member_id => STRING
 */

module.exports = ({ groupId, groupGenerationId, memberId }) =>
  Object.assign(requestV1({ groupId, groupGenerationId, memberId }), { apiVersion: 2 })
