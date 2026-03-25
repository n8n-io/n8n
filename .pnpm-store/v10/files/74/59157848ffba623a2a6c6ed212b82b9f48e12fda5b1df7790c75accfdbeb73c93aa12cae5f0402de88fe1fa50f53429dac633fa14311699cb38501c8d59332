const Encoder = require('../../../encoder')
const { InitProducerId: apiKey } = require('../../apiKeys')

/**
 * InitProducerId Request (Version: 0) => transactional_id transaction_timeout_ms
 *   transactional_id => NULLABLE_STRING
 *   transaction_timeout_ms => INT32
 */

module.exports = ({ transactionalId, transactionTimeout }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'InitProducerId',
  encode: async () => {
    return new Encoder().writeString(transactionalId).writeInt32(transactionTimeout)
  },
})
