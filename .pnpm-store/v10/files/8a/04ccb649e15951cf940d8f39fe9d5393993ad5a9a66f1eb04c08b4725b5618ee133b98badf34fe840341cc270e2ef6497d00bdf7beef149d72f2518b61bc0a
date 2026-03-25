const Encoder = require('../../../encoder')
const { Metadata: apiKey } = require('../../apiKeys')

/**
 * Metadata Request (Version: 0) => [topics]
 *   topics => STRING
 */

module.exports = ({ topics }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'Metadata',
  encode: async () => {
    return new Encoder().writeArray(topics)
  },
})
