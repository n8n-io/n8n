const requestV1 = require('../v1/request')

/**
 * LeaveGroup Request (Version: 2) => group_id member_id
 *   group_id => STRING
 *   member_id => STRING
 */

module.exports = ({ groupId, memberId }) =>
  Object.assign(requestV1({ groupId, memberId }), { apiVersion: 2 })
