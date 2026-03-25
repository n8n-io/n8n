const Encoder = require('../../../encoder')
const { GroupCoordinator: apiKey } = require('../../apiKeys')

/**
 * FindCoordinator Request (Version: 0) => group_id
 *   group_id => STRING
 */

module.exports = ({ groupId }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'GroupCoordinator',
  encode: async () => {
    return new Encoder().writeString(groupId)
  },
})
