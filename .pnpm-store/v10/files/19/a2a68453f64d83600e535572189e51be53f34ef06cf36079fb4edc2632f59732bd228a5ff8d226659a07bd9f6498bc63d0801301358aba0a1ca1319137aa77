const Encoder = require('../../../encoder')
const { Heartbeat: apiKey } = require('../../apiKeys')

/**
 * Version 3 adds group_instance_id to indicate member identity across restarts.
 * @see https://cwiki.apache.org/confluence/display/KAFKA/KIP-345%3A+Introduce+static+membership+protocol+to+reduce+consumer+rebalances
 *
 * Heartbeat Request (Version: 3) => group_id generation_id member_id group_instance_id
 *   group_id => STRING
 *   generation_id => INT32
 *   member_id => STRING
 *   group_instance_id => NULLABLE_STRING
 */

module.exports = ({ groupId, groupGenerationId, memberId, groupInstanceId }) => ({
  apiKey,
  apiVersion: 3,
  apiName: 'Heartbeat',
  encode: async () => {
    return new Encoder()
      .writeString(groupId)
      .writeInt32(groupGenerationId)
      .writeString(memberId)
      .writeString(groupInstanceId)
  },
})
