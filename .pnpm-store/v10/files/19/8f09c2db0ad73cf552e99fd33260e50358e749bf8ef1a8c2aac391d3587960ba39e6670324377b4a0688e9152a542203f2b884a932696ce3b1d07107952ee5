const versions = {
  0: () => {
    const request = require('./v0/request')
    const response = require('./v0/response')
    return { request: request(), response }
  },
  1: () => {
    const request = require('./v1/request')
    const response = require('./v1/response')
    return { request: request(), response }
  },
  2: () => {
    const request = require('./v2/request')
    const response = require('./v2/response')
    return { request: request(), response }
  },
}

module.exports = {
  versions: Object.keys(versions),
  protocol: ({ version }) => versions[version],
}
