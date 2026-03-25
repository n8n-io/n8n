const Encoder = require('../../../encoder')
const { DescribeAcls: apiKey } = require('../../apiKeys')

/**
 * DescribeAcls Request (Version: 1) => resource_type resource_name resource_pattern_type_filter principal host operation permission_type
 *   resource_type => INT8
 *   resource_name => NULLABLE_STRING
 *   resource_pattern_type_filter => INT8
 *   principal => NULLABLE_STRING
 *   host => NULLABLE_STRING
 *   operation => INT8
 *   permission_type => INT8
 */

module.exports = ({
  resourceType,
  resourceName,
  resourcePatternType,
  principal,
  host,
  operation,
  permissionType,
}) => ({
  apiKey,
  apiVersion: 1,
  apiName: 'DescribeAcls',
  encode: async () => {
    return new Encoder()
      .writeInt8(resourceType)
      .writeString(resourceName)
      .writeInt8(resourcePatternType)
      .writeString(principal)
      .writeString(host)
      .writeInt8(operation)
      .writeInt8(permissionType)
  },
})
