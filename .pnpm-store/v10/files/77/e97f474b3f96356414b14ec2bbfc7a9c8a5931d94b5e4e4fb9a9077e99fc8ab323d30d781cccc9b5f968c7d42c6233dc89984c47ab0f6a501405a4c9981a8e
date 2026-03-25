const versions = {
  0: ({ transactionalId, groupId, producerId, producerEpoch, topics }) => {
    const request = require('./v0/request')
    const response = require('./v0/response')
    return {
      request: request({ transactionalId, groupId, producerId, producerEpoch, topics }),
      response,
    }
  },
  1: ({ transactionalId, groupId, producerId, producerEpoch, topics }) => {
    const request = require('./v1/request')
    const response = require('./v1/response')
    return {
      request: request({ transactionalId, groupId, producerId, producerEpoch, topics }),
      response,
    }
  },
}

module.exports = {
  versions: Object.keys(versions),
  protocol: ({ version }) => versions[version],
}
