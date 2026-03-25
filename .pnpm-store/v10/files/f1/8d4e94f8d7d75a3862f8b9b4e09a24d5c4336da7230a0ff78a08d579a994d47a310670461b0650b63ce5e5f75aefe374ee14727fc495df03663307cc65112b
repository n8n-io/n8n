const requestV0 = require('../v0/request')

/**
 * AddOffsetsToTxn Request (Version: 1) => transactional_id producer_id producer_epoch group_id
 *   transactional_id => STRING
 *   producer_id => INT64
 *   producer_epoch => INT16
 *   group_id => STRING
 */

module.exports = ({ transactionalId, producerId, producerEpoch, groupId }) =>
  Object.assign(
    requestV0({
      transactionalId,
      producerId,
      producerEpoch,
      groupId,
    }),
    { apiVersion: 1 }
  )
