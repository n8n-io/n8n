const versions = {
  0: ({ groupId, memberId }) => {
    const request = require('./v0/request')
    const response = require('./v0/response')
    return {
      request: request({ groupId, memberId }),
      response,
    }
  },
  1: ({ groupId, memberId }) => {
    const request = require('./v1/request')
    const response = require('./v1/response')
    return {
      request: request({ groupId, memberId }),
      response,
    }
  },
  2: ({ groupId, memberId }) => {
    const request = require('./v2/request')
    const response = require('./v2/response')
    return {
      request: request({ groupId, memberId }),
      response,
    }
  },
  3: ({ groupId, memberId, groupInstanceId }) => {
    const request = require('./v3/request')
    const response = require('./v3/response')
    return {
      request: request({ groupId, members: [{ memberId, groupInstanceId }] }),
      response,
    }
  },
}

module.exports = {
  versions: Object.keys(versions),
  protocol: ({ version }) => versions[version],
}
