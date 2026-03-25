const COORDINATOR_TYPES = require('../../coordinatorTypes')

const versions = {
  0: ({ groupId }) => {
    const request = require('./v0/request')
    const response = require('./v0/response')
    return { request: request({ groupId }), response }
  },
  1: ({ groupId, coordinatorType = COORDINATOR_TYPES.GROUP }) => {
    const request = require('./v1/request')
    const response = require('./v1/response')
    return { request: request({ coordinatorKey: groupId, coordinatorType }), response }
  },
  2: ({ groupId, coordinatorType = COORDINATOR_TYPES.GROUP }) => {
    const request = require('./v2/request')
    const response = require('./v2/response')
    return { request: request({ coordinatorKey: groupId, coordinatorType }), response }
  },
}

module.exports = {
  versions: Object.keys(versions),
  protocol: ({ version }) => versions[version],
}
