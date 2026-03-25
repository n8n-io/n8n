const Encoder = require('../../../encoder')
const { LeaveGroup: apiKey } = require('../../apiKeys')

/**
 * LeaveGroup Request (Version: 0) => group_id member_id
 *   group_id => STRING
 *   member_id => STRING
 */

module.exports = ({ groupId, memberId }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'LeaveGroup',
  encode: async () => {
    return new Encoder().writeString(groupId).writeString(memberId)
  },
})
