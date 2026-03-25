const requestV0 = require('../v0/request')

/**
 * LeaveGroup Request (Version: 1) => group_id member_id
 *   group_id => STRING
 *   member_id => STRING
 */

module.exports = ({ groupId, memberId }) =>
  Object.assign(requestV0({ groupId, memberId }), { apiVersion: 1 })
