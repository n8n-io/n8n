const requestV0 = require('../v0/request')

/**
 * EndTxn Request (Version: 1) => transactional_id producer_id producer_epoch transaction_result
 *   transactional_id => STRING
 *   producer_id => INT64
 *   producer_epoch => INT16
 *   transaction_result => BOOLEAN
 */

module.exports = ({ transactionalId, producerId, producerEpoch, transactionResult }) =>
  Object.assign(requestV0({ transactionalId, producerId, producerEpoch, transactionResult }), {
    apiVersion: 1,
  })
