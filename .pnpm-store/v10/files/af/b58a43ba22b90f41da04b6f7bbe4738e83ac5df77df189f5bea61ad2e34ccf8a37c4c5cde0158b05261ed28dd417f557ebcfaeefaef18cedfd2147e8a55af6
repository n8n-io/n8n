const Encoder = require('../../../encoder')
const { DescribeGroups: apiKey } = require('../../apiKeys')

/**
 * DescribeGroups Request (Version: 0) => [group_ids]
 *   group_ids => STRING
 */

/**
 * @param {Array} groupIds List of groupIds to request metadata for (an empty groupId array will return empty group metadata)
 */
module.exports = ({ groupIds }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'DescribeGroups',
  encode: async () => {
    return new Encoder().writeArray(groupIds)
  },
})
