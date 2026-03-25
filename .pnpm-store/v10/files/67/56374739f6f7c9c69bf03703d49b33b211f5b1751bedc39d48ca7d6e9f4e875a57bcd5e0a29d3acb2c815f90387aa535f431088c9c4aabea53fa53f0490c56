const versions = {
  0: ({ transactionalId, producerId, producerEpoch, groupId }) => {
    const request = require('./v0/request')
    const response = require('./v0/response')
    return { request: request({ transactionalId, producerId, producerEpoch, groupId }), response }
  },
  1: ({ transactionalId, producerId, producerEpoch, groupId }) => {
    const request = require('./v1/request')
    const response = require('./v1/response')
    return { request: request({ transactionalId, producerId, producerEpoch, groupId }), response }
  },
}

module.exports = {
  versions: Object.keys(versions),
  protocol: ({ version }) => versions[version],
}
