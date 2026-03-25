const Decoder = require('../../../decoder')
const { parse: parseV1 } = require('../v1/response')

/**
 * CreateTopics Response (Version: 2) => throttle_time_ms [topic_errors]
 *   throttle_time_ms => INT32
 *   topic_errors => topic error_code error_message
 *     topic => STRING
 *     error_code => INT16
 *     error_message => NULLABLE_STRING
 */

const topicNameComparator = (a, b) => a.topic.localeCompare(b.topic)

const topicErrors = decoder => ({
  topic: decoder.readString(),
  errorCode: decoder.readInt16(),
  errorMessage: decoder.readString(),
})

const decode = async rawData => {
  const decoder = new Decoder(rawData)
  return {
    throttleTime: decoder.readInt32(),
    topicErrors: decoder.readArray(topicErrors).sort(topicNameComparator),
  }
}

module.exports = {
  decode,
  parse: parseV1,
}
