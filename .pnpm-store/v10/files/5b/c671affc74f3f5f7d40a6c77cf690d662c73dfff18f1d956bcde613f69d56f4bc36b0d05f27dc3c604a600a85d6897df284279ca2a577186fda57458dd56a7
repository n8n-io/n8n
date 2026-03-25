const requestV1 = require('../v1/request')

/**
 * FindCoordinator Request (Version: 2) => coordinator_key coordinator_type
 *   coordinator_key => STRING
 *   coordinator_type => INT8
 */

module.exports = ({ coordinatorKey, coordinatorType }) =>
  Object.assign(requestV1({ coordinatorKey, coordinatorType }), { apiVersion: 2 })
