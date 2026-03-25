const NETWORK_DELAY = 5000

/**
 * @see https://github.com/apache/kafka/pull/5203
 * The JOIN_GROUP request may block up to sessionTimeout (or rebalanceTimeout in JoinGroupV1),
 * so we should override the requestTimeout to be a bit more than the sessionTimeout
 * NOTE: the sessionTimeout can be configured as Number.MAX_SAFE_INTEGER and overflow when
 * increased, so we have to check for potential overflows
 **/
const requestTimeout = ({ rebalanceTimeout, sessionTimeout }) => {
  const timeout = rebalanceTimeout || sessionTimeout
  return Number.isSafeInteger(timeout + NETWORK_DELAY) ? timeout + NETWORK_DELAY : timeout
}

const logResponseError = memberId => memberId != null && memberId !== ''

const versions = {
  0: ({ groupId, sessionTimeout, memberId, protocolType, groupProtocols }) => {
    const request = require('./v0/request')
    const response = require('./v0/response')

    return {
      request: request({
        groupId,
        sessionTimeout,
        memberId,
        protocolType,
        groupProtocols,
      }),
      response,
      requestTimeout: requestTimeout({ rebalanceTimeout: null, sessionTimeout }),
    }
  },
  1: ({ groupId, sessionTimeout, rebalanceTimeout, memberId, protocolType, groupProtocols }) => {
    const request = require('./v1/request')
    const response = require('./v1/response')

    return {
      request: request({
        groupId,
        sessionTimeout,
        rebalanceTimeout,
        memberId,
        protocolType,
        groupProtocols,
      }),
      response,
      requestTimeout: requestTimeout({ rebalanceTimeout, sessionTimeout }),
    }
  },
  2: ({ groupId, sessionTimeout, rebalanceTimeout, memberId, protocolType, groupProtocols }) => {
    const request = require('./v2/request')
    const response = require('./v2/response')

    return {
      request: request({
        groupId,
        sessionTimeout,
        rebalanceTimeout,
        memberId,
        protocolType,
        groupProtocols,
      }),
      response,
      requestTimeout: requestTimeout({ rebalanceTimeout, sessionTimeout }),
    }
  },
  3: ({ groupId, sessionTimeout, rebalanceTimeout, memberId, protocolType, groupProtocols }) => {
    const request = require('./v3/request')
    const response = require('./v3/response')

    return {
      request: request({
        groupId,
        sessionTimeout,
        rebalanceTimeout,
        memberId,
        protocolType,
        groupProtocols,
      }),
      response,
      requestTimeout: requestTimeout({ rebalanceTimeout, sessionTimeout }),
    }
  },
  4: ({ groupId, sessionTimeout, rebalanceTimeout, memberId, protocolType, groupProtocols }) => {
    const request = require('./v4/request')
    const response = require('./v4/response')

    return {
      request: request({
        groupId,
        sessionTimeout,
        rebalanceTimeout,
        memberId,
        protocolType,
        groupProtocols,
      }),
      response,
      requestTimeout: requestTimeout({ rebalanceTimeout, sessionTimeout }),
      logResponseError: logResponseError(memberId),
    }
  },
  5: ({
    groupId,
    sessionTimeout,
    rebalanceTimeout,
    memberId,
    groupInstanceId,
    protocolType,
    groupProtocols,
  }) => {
    const request = require('./v5/request')
    const response = require('./v5/response')

    return {
      request: request({
        groupId,
        sessionTimeout,
        rebalanceTimeout,
        memberId,
        groupInstanceId,
        protocolType,
        groupProtocols,
      }),
      response,
      requestTimeout: requestTimeout({ rebalanceTimeout, sessionTimeout }),
      logResponseError: logResponseError(memberId),
    }
  },
}

module.exports = {
  versions: Object.keys(versions),
  protocol: ({ version }) => versions[version],
}
