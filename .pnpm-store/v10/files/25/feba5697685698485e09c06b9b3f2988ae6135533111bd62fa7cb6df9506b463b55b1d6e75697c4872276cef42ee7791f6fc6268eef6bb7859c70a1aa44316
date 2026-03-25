const Encoder = require('../../../encoder')
const { CreateAcls: apiKey } = require('../../apiKeys')

/**
 * CreateAcls Request (Version: 0) => [creations]
 *   creations => resource_type resource_name principal host operation permission_type
 *     resource_type => INT8
 *     resource_name => STRING
 *     principal => STRING
 *     host => STRING
 *     operation => INT8
 *     permission_type => INT8
 */

const encodeCreations = ({
  resourceType,
  resourceName,
  principal,
  host,
  operation,
  permissionType,
}) => {
  return new Encoder()
    .writeInt8(resourceType)
    .writeString(resourceName)
    .writeString(principal)
    .writeString(host)
    .writeInt8(operation)
    .writeInt8(permissionType)
}

module.exports = ({ creations }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'CreateAcls',
  encode: async () => {
    return new Encoder().writeArray(creations.map(encodeCreations))
  },
})
