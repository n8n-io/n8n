const versions = {
  0: ({ topics }) => {
    const request = require('./v0/request')
    const response = require('./v0/response')
    return { request: request({ topics }), response }
  },
  1: ({ topics }) => {
    const request = require('./v1/request')
    const response = require('./v1/response')
    return { request: request({ topics }), response }
  },
  2: ({ topics }) => {
    const request = require('./v2/request')
    const response = require('./v2/response')
    return { request: request({ topics }), response }
  },
  3: ({ topics }) => {
    const request = require('./v3/request')
    const response = require('./v3/response')
    return { request: request({ topics }), response }
  },
  4: ({ topics, allowAutoTopicCreation }) => {
    const request = require('./v4/request')
    const response = require('./v4/response')
    return { request: request({ topics, allowAutoTopicCreation }), response }
  },
  5: ({ topics, allowAutoTopicCreation }) => {
    const request = require('./v5/request')
    const response = require('./v5/response')
    return { request: request({ topics, allowAutoTopicCreation }), response }
  },
  6: ({ topics, allowAutoTopicCreation }) => {
    const request = require('./v6/request')
    const response = require('./v6/response')
    return { request: request({ topics, allowAutoTopicCreation }), response }
  },
}

module.exports = {
  versions: Object.keys(versions),
  protocol: ({ version }) => versions[version],
}
