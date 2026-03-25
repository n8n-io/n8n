const versions = {
  0: ({ resourceType, resourceName, principal, host, operation, permissionType }) => {
    const request = require('./v0/request')
    const response = require('./v0/response')
    return {
      request: request({ resourceType, resourceName, principal, host, operation, permissionType }),
      response,
    }
  },
  1: ({
    resourceType,
    resourceName,
    resourcePatternType,
    principal,
    host,
    operation,
    permissionType,
  }) => {
    const request = require('./v1/request')
    const response = require('./v1/response')
    return {
      request: request({
        resourceType,
        resourceName,
        resourcePatternType,
        principal,
        host,
        operation,
        permissionType,
      }),
      response,
    }
  },
}

module.exports = {
  versions: Object.keys(versions),
  protocol: ({ version }) => versions[version],
}
