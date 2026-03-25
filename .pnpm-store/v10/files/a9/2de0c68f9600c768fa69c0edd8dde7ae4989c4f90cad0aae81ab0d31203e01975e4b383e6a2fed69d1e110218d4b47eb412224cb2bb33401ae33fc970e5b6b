const versions = {
  0: ({ groupIds }) => {
    const request = require('./v0/request')
    const response = require('./v0/response')
    return { request: request({ groupIds }), response }
  },
  1: ({ groupIds }) => {
    const request = require('./v1/request')
    const response = require('./v1/response')
    return { request: request({ groupIds }), response }
  },
  2: ({ groupIds }) => {
    const request = require('./v2/request')
    const response = require('./v2/response')
    return { request: request({ groupIds }), response }
  },
}

module.exports = {
  versions: Object.keys(versions),
  protocol: ({ version }) => versions[version],
}
