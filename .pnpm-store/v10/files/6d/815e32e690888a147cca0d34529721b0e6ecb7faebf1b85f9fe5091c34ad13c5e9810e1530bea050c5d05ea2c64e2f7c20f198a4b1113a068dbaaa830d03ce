const requestV0 = require('../v0/request')

/**
 * AddPartitionsToTxn Request (Version: 1) => transactional_id producer_id producer_epoch [topics]
 *   transactional_id => STRING
 *   producer_id => INT64
 *   producer_epoch => INT16
 *   topics => topic [partitions]
 *     topic => STRING
 *     partitions => INT32
 */

module.exports = ({ transactionalId, producerId, producerEpoch, topics }) =>
  Object.assign(
    requestV0({
      transactionalId,
      producerId,
      producerEpoch,
      topics,
    }),
    { apiVersion: 1 }
  )
