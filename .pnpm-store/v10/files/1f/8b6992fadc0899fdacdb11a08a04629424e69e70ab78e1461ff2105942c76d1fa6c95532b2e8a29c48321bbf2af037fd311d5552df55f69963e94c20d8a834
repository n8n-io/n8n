const requestV0 = require('../v0/request')

module.exports = ({ replicaId, maxWaitTime, minBytes, topics }) => {
  return Object.assign(requestV0({ replicaId, maxWaitTime, minBytes, topics }), { apiVersion: 1 })
}
