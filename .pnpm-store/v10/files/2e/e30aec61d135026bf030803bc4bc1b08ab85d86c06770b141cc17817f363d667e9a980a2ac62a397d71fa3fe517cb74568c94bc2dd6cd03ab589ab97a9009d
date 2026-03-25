const requestV0 = require('../v0/request')

/**
 * CreatePartitions Request (Version: 1) => [topic_partitions] timeout validate_only
 *   topic_partitions => topic new_partitions
 *     topic => STRING
 *     new_partitions => count [assignment]
 *       count => INT32
 *       assignment => ARRAY(INT32)
 *   timeout => INT32
 *   validate_only => BOOLEAN
 */

module.exports = ({ topicPartitions, validateOnly, timeout }) =>
  Object.assign(requestV0({ topicPartitions, validateOnly, timeout }), { apiVersion: 1 })
