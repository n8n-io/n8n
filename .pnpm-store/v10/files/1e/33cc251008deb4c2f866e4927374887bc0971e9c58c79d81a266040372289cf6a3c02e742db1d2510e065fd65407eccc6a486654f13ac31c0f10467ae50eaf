const logResponseError = false

const versions = {
  0: () => {
    const request = require('./v0/request')
    const response = require('./v0/response')
    return { request: request(), response, logResponseError: true }
  },
  1: () => {
    const request = require('./v1/request')
    const response = require('./v1/response')
    return { request: request(), response, logResponseError }
  },
  2: () => {
    const request = require('./v2/request')
    const response = require('./v2/response')
    return { request: request(), response, logResponseError }
  },
}

module.exports = {
  versions: Object.keys(versions),
  protocol: ({ version }) => versions[version],
}
