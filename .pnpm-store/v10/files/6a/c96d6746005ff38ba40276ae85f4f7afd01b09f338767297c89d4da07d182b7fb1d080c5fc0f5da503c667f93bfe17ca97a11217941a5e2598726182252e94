const versions = {
  0: ({ mechanism }) => {
    const request = require('./v0/request')
    const response = require('./v0/response')
    return { request: request({ mechanism }), response }
  },
  1: ({ mechanism }) => {
    const request = require('./v1/request')
    const response = require('./v1/response')
    return { request: request({ mechanism }), response }
  },
}

module.exports = {
  versions: Object.keys(versions),
  protocol: ({ version }) => versions[version],
}
