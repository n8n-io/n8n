const Encoder = require('../../../encoder')
const { Metadata: apiKey } = require('../../apiKeys')

/**
 * Metadata Request (Version: 4) => [topics] allow_auto_topic_creation
 *   topics => STRING
 *   allow_auto_topic_creation => BOOLEAN
 */

module.exports = ({ topics, allowAutoTopicCreation = true }) => ({
  apiKey,
  apiVersion: 4,
  apiName: 'Metadata',
  encode: async () => {
    return new Encoder().writeNullableArray(topics).writeBoolean(allowAutoTopicCreation)
  },
})
