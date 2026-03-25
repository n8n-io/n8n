const requestV3 = require('../v3/request')

/**
 * Starting in version 4, the client needs to issue a second request to join group
 * with assigned id.
 *
 * JoinGroup Request (Version: 4) => group_id session_timeout rebalance_timeout member_id protocol_type [group_protocols]
 *   group_id => STRING
 *   session_timeout => INT32
 *   rebalance_timeout => INT32
 *   member_id => STRING
 *   protocol_type => STRING
 *   group_protocols => protocol_name protocol_metadata
 *     protocol_name => STRING
 *     protocol_metadata => BYTES
 */

module.exports = ({
  groupId,
  sessionTimeout,
  rebalanceTimeout,
  memberId,
  protocolType,
  groupProtocols,
}) =>
  Object.assign(
    requestV3({
      groupId,
      sessionTimeout,
      rebalanceTimeout,
      memberId,
      protocolType,
      groupProtocols,
    }),
    { apiVersion: 4 }
  )
