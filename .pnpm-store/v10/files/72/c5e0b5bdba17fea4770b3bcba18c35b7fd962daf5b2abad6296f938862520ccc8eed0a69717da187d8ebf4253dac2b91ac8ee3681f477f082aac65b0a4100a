const Encoder = require('../../../encoder')
const { SyncGroup: apiKey } = require('../../apiKeys')

/**
 * Version 3 adds group_instance_id to indicate member identity across restarts.
 * @see https://cwiki.apache.org/confluence/display/KAFKA/KIP-345%3A+Introduce+static+membership+protocol+to+reduce+consumer+rebalances
 *
 * SyncGroup Request (Version: 3) => group_id generation_id member_id group_instance_id [group_assignment]
 *   group_id => STRING
 *   generation_id => INT32
 *   member_id => STRING
 *   group_instance_id => NULLABLE_STRING
 *   group_assignment => member_id member_assignment
 *     member_id => STRING
 *     member_assignment => BYTES
 */

module.exports = ({
  groupId,
  generationId,
  memberId,
  groupInstanceId = null,
  groupAssignment,
}) => ({
  apiKey,
  apiVersion: 3,
  apiName: 'SyncGroup',
  encode: async () => {
    return new Encoder()
      .writeString(groupId)
      .writeInt32(generationId)
      .writeString(memberId)
      .writeString(groupInstanceId)
      .writeArray(groupAssignment.map(encodeGroupAssignment))
  },
})

const encodeGroupAssignment = ({ memberId, memberAssignment }) => {
  return new Encoder().writeString(memberId).writeBytes(memberAssignment)
}
