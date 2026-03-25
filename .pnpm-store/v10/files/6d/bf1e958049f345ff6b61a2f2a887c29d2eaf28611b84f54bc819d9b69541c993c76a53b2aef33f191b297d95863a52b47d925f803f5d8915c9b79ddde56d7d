const versions = {
  0: ({ topics, timeout }) => {
    const request = require('./v0/request')
    const response = require('./v0/response')
    return { request: request({ topics, timeout }), response }
  },
  1: ({ topics, validateOnly, timeout }) => {
    const request = require('./v1/request')
    const response = require('./v1/response')
    return { request: request({ topics, validateOnly, timeout }), response }
  },
  2: ({ topics, validateOnly, timeout }) => {
    const request = require('./v2/request')
    const response = require('./v2/response')
    return { request: request({ topics, validateOnly, timeout }), response }
  },
  3: ({ topics, validateOnly, timeout }) => {
    const request = require('./v3/request')
    const response = require('./v3/response')
    return { request: request({ topics, validateOnly, timeout }), response }
  },
}

module.exports = {
  versions: Object.keys(versions),
  protocol: ({ version }) => versions[version],
}
