const requestV0 = require('../v0/request')

// Produce Request on or after v1 indicates the client can parse the quota throttle time
// in the Produce Response.

module.exports = ({ acks, timeout, topicData }) => {
  return Object.assign(requestV0({ acks, timeout, topicData }), { apiVersion: 1 })
}
