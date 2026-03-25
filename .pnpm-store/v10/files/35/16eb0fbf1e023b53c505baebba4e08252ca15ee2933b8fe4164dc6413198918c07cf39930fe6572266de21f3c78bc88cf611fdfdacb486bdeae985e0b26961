const requestV4 = require('../v4/request')

/**
 * Metadata Request (Version: 5) => [topics] allow_auto_topic_creation
 *   topics => STRING
 *   allow_auto_topic_creation => BOOLEAN
 */

module.exports = ({ topics, allowAutoTopicCreation = true }) =>
  Object.assign(requestV4({ topics, allowAutoTopicCreation }), { apiVersion: 5 })
