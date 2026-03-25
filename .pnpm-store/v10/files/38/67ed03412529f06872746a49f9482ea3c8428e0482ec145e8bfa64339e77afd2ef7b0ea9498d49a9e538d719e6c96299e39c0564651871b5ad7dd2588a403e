const requestV0 = require('../v0/request')

/**
 * Heartbeat Request (Version: 1) => group_id generation_id member_id
 *   group_id => STRING
 *   generation_id => INT32
 *   member_id => STRING
 */

module.exports = ({ groupId, groupGenerationId, memberId }) =>
  Object.assign(requestV0({ groupId, groupGenerationId, memberId }), { apiVersion: 1 })
