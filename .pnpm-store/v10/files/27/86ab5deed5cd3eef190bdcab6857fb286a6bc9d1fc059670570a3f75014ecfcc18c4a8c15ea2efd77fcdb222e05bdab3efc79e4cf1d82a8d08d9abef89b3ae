const requestV5 = require('../v5/request')

/**
 * Metadata Request (Version: 6) => [topics] allow_auto_topic_creation
 *   topics => STRING
 *   allow_auto_topic_creation => BOOLEAN
 */

module.exports = ({ topics, allowAutoTopicCreation = true }) =>
  Object.assign(requestV5({ topics, allowAutoTopicCreation }), { apiVersion: 6 })
