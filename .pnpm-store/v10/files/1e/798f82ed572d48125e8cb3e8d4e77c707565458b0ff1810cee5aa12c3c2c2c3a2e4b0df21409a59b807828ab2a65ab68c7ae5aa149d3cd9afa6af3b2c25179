const ISOLATION_LEVEL = require('../../isolationLevel')

// For normal consumers, use -1
const REPLICA_ID = -1

const versions = {
  0: ({ replicaId = REPLICA_ID, topics }) => {
    const request = require('./v0/request')
    const response = require('./v0/response')
    return { request: request({ replicaId, topics }), response }
  },
  1: ({ replicaId = REPLICA_ID, topics }) => {
    const request = require('./v1/request')
    const response = require('./v1/response')
    return { request: request({ replicaId, topics }), response }
  },
  2: ({ replicaId = REPLICA_ID, isolationLevel = ISOLATION_LEVEL.READ_COMMITTED, topics }) => {
    const request = require('./v2/request')
    const response = require('./v2/response')
    return { request: request({ replicaId, isolationLevel, topics }), response }
  },
  3: ({ replicaId = REPLICA_ID, isolationLevel = ISOLATION_LEVEL.READ_COMMITTED, topics }) => {
    const request = require('./v3/request')
    const response = require('./v3/response')
    return { request: request({ replicaId, isolationLevel, topics }), response }
  },
}

module.exports = {
  versions: Object.keys(versions),
  protocol: ({ version }) => versions[version],
}
