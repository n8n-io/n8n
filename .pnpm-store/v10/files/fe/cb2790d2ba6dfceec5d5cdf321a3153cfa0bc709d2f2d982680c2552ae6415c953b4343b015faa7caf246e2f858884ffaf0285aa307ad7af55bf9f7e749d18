// This value signals to the broker that its default configuration should be used.
const RETENTION_TIME = -1

const versions = {
  0: ({ groupId, topics }) => {
    const request = require('./v0/request')
    const response = require('./v0/response')
    return { request: request({ groupId, topics }), response }
  },
  1: ({ groupId, groupGenerationId, memberId, topics }) => {
    const request = require('./v1/request')
    const response = require('./v1/response')
    return { request: request({ groupId, groupGenerationId, memberId, topics }), response }
  },
  2: ({ groupId, groupGenerationId, memberId, retentionTime = RETENTION_TIME, topics }) => {
    const request = require('./v2/request')
    const response = require('./v2/response')
    return {
      request: request({
        groupId,
        groupGenerationId,
        memberId,
        retentionTime,
        topics,
      }),
      response,
    }
  },
  3: ({ groupId, groupGenerationId, memberId, retentionTime = RETENTION_TIME, topics }) => {
    const request = require('./v3/request')
    const response = require('./v3/response')
    return {
      request: request({
        groupId,
        groupGenerationId,
        memberId,
        retentionTime,
        topics,
      }),
      response,
    }
  },
  4: ({ groupId, groupGenerationId, memberId, retentionTime = RETENTION_TIME, topics }) => {
    const request = require('./v4/request')
    const response = require('./v4/response')
    return {
      request: request({
        groupId,
        groupGenerationId,
        memberId,
        retentionTime,
        topics,
      }),
      response,
    }
  },
  5: ({ groupId, groupGenerationId, memberId, topics }) => {
    const request = require('./v5/request')
    const response = require('./v5/response')
    return {
      request: request({
        groupId,
        groupGenerationId,
        memberId,
        topics,
      }),
      response,
    }
  },
}

module.exports = {
  versions: Object.keys(versions),
  protocol: ({ version }) => versions[version],
}
