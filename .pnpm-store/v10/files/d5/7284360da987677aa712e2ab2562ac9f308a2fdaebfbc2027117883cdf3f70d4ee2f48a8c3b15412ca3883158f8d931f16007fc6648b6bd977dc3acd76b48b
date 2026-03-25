const requestV0 = require('../v0/request')

/**
 * InitProducerId Request (Version: 1) => transactional_id transaction_timeout_ms
 *   transactional_id => NULLABLE_STRING
 *   transaction_timeout_ms => INT32
 */

module.exports = ({ transactionalId, transactionTimeout }) =>
  Object.assign(requestV0({ transactionalId, transactionTimeout }), { apiVersion: 1 })
