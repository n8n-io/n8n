const Encoder = require('../../../encoder')
const { DeleteGroups: apiKey } = require('../../apiKeys')

/**
 * DeleteGroups Request (Version: 0) => [groups_names]
 *   groups_names => STRING
 */

/**
 */
module.exports = groupIds => ({
  apiKey,
  apiVersion: 0,
  apiName: 'DeleteGroups',
  encode: async () => {
    return new Encoder().writeArray(groupIds.map(encodeGroups))
  },
})

const encodeGroups = group => {
  return new Encoder().writeString(group)
}
