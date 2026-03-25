const versions = {
  0: ({ resources }) => {
    const request = require('./v0/request')
    const response = require('./v0/response')
    return { request: request({ resources }), response }
  },
  1: ({ resources, includeSynonyms }) => {
    const request = require('./v1/request')
    const response = require('./v1/response')
    return { request: request({ resources, includeSynonyms }), response }
  },
  2: ({ resources, includeSynonyms }) => {
    const request = require('./v2/request')
    const response = require('./v2/response')
    return { request: request({ resources, includeSynonyms }), response }
  },
}

module.exports = {
  versions: Object.keys(versions),
  protocol: ({ version }) => versions[version],
}
