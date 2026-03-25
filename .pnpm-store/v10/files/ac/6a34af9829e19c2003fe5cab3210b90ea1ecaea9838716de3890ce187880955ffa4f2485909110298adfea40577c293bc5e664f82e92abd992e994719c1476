const Encoder = require('../../../encoder')
const { DeleteTopics: apiKey } = require('../../apiKeys')

/**
 * DeleteTopics Request (Version: 0) => [topics] timeout
 *   topics => STRING
 *   timeout => INT32
 */
module.exports = ({ topics, timeout = 5000 }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'DeleteTopics',
  encode: async () => {
    return new Encoder().writeArray(topics).writeInt32(timeout)
  },
})
