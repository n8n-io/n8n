const versions = {
  0: ({ transactionalId, transactionTimeout = 5000 }) => {
    const request = require('./v0/request')
    const response = require('./v0/response')
    return { request: request({ transactionalId, transactionTimeout }), response }
  },
  1: ({ transactionalId, transactionTimeout = 5000 }) => {
    const request = require('./v1/request')
    const response = require('./v1/response')
    return { request: request({ transactionalId, transactionTimeout }), response }
  },
}

module.exports = {
  versions: Object.keys(versions),
  protocol: ({ version }) => versions[version],
}
