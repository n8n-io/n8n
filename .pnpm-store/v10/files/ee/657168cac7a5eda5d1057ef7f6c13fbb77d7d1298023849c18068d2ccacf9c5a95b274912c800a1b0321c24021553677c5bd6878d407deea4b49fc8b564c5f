const requestV0 = require('../v0/request')

/**
 * DeleteTopics Request (Version: 1) => [topics] timeout
 *   topics => STRING
 *   timeout => INT32
 */

module.exports = ({ topics, timeout }) =>
  Object.assign(requestV0({ topics, timeout }), { apiVersion: 1 })
