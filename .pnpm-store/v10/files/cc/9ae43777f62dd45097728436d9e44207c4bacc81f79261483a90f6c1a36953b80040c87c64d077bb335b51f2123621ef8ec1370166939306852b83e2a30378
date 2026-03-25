const versions = {
  0: ({ transactionalId, producerId, producerEpoch, transactionResult }) => {
    const request = require('./v0/request')
    const response = require('./v0/response')
    return {
      request: request({ transactionalId, producerId, producerEpoch, transactionResult }),
      response,
    }
  },
  1: ({ transactionalId, producerId, producerEpoch, transactionResult }) => {
    const request = require('./v1/request')
    const response = require('./v1/response')
    return {
      request: request({ transactionalId, producerId, producerEpoch, transactionResult }),
      response,
    }
  },
}

module.exports = {
  versions: Object.keys(versions),
  protocol: ({ version }) => versions[version],
}
