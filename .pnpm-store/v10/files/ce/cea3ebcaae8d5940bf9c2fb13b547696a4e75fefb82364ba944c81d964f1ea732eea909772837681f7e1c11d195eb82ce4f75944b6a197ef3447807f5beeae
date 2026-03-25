const Encoder = require('../../../encoder')
const { GroupCoordinator: apiKey } = require('../../apiKeys')

/**
 * FindCoordinator Request (Version: 1) => coordinator_key coordinator_type
 *   coordinator_key => STRING
 *   coordinator_type => INT8
 */

module.exports = ({ coordinatorKey, coordinatorType }) => ({
  apiKey,
  apiVersion: 1,
  apiName: 'GroupCoordinator',
  encode: async () => {
    return new Encoder().writeString(coordinatorKey).writeInt8(coordinatorType)
  },
})
