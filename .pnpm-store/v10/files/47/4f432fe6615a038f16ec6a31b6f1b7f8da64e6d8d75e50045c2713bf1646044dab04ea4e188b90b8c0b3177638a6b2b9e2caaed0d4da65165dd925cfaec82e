const Encoder = require('../../../encoder')
const { EndTxn: apiKey } = require('../../apiKeys')

/**
 * EndTxn Request (Version: 0) => transactional_id producer_id producer_epoch transaction_result
 *   transactional_id => STRING
 *   producer_id => INT64
 *   producer_epoch => INT16
 *   transaction_result => BOOLEAN
 */

module.exports = ({ transactionalId, producerId, producerEpoch, transactionResult }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'EndTxn',
  encode: async () => {
    return new Encoder()
      .writeString(transactionalId)
      .writeInt64(producerId)
      .writeInt16(producerEpoch)
      .writeBoolean(transactionResult)
  },
})
