const versions = {
  0: ({ topicPartitions, timeout, validateOnly }) => {
    const request = require('./v0/request')
    const response = require('./v0/response')
    return { request: request({ topicPartitions, timeout, validateOnly }), response }
  },
  1: ({ topicPartitions, validateOnly, timeout }) => {
    const request = require('./v1/request')
    const response = require('./v1/response')
    return { request: request({ topicPartitions, validateOnly, timeout }), response }
  },
}

module.exports = {
  versions: Object.keys(versions),
  protocol: ({ version }) => versions[version],
}
