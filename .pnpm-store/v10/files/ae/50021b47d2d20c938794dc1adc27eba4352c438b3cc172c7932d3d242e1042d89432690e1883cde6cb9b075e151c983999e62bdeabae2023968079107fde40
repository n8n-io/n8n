const Decoder = require('../../../decoder')
const { failure, createErrorFromCode } = require('../../../error')
const { KafkaJSAggregateError, KafkaJSCreateTopicError } = require('../../../../errors')

/**
 * CreateTopics Response (Version: 0) => [topic_errors]
 *   topic_errors => topic error_code
 *     topic => STRING
 *     error_code => INT16
 */

const topicNameComparator = (a, b) => a.topic.localeCompare(b.topic)

const topicErrors = decoder => ({
  topic: decoder.readString(),
  errorCode: decoder.readInt16(),
})

const decode = async rawData => {
  const decoder = new Decoder(rawData)
  return {
    topicErrors: decoder.readArray(topicErrors).sort(topicNameComparator),
  }
}

const parse = async data => {
  const topicsWithError = data.topicErrors.filter(({ errorCode }) => failure(errorCode))
  if (topicsWithError.length > 0) {
    throw new KafkaJSAggregateError(
      'Topic creation errors',
      topicsWithError.map(
        error => new KafkaJSCreateTopicError(createErrorFromCode(error.errorCode), error.topic)
      )
    )
  }

  return data
}

module.exports = {
  decode,
  parse,
}
