const Encoder = require('../../../encoder')
const { Metadata: apiKey } = require('../../apiKeys')

/**
 * Metadata Request (Version: 1) => [topics]
 *   topics => STRING
 */

module.exports = ({ topics }) => ({
  apiKey,
  apiVersion: 1,
  apiName: 'Metadata',
  encode: async () => {
    return new Encoder().writeNullableArray(topics)
  },
})
