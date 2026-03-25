const Encoder = require('../../../encoder')
const { SyncGroup: apiKey } = require('../../apiKeys')

/**
 * SyncGroup Request (Version: 0) => group_id generation_id member_id [group_assignment]
 *   group_id => STRING
 *   generation_id => INT32
 *   member_id => STRING
 *   group_assignment => member_id member_assignment
 *     member_id => STRING
 *     member_assignment => BYTES
 */

module.exports = ({ groupId, generationId, memberId, groupAssignment }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'SyncGroup',
  encode: async () => {
    return new Encoder()
      .writeString(groupId)
      .writeInt32(generationId)
      .writeString(memberId)
      .writeArray(groupAssignment.map(encodeGroupAssignment))
  },
})

const encodeGroupAssignment = ({ memberId, memberAssignment }) => {
  return new Encoder().writeString(memberId).writeBytes(memberAssignment)
}
