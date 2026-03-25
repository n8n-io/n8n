const Encoder = require('../../../encoder')
const { DescribeConfigs: apiKey } = require('../../apiKeys')

/**
 * DescribeConfigs Request (Version: 0) => [resources]
 *   resources => resource_type resource_name [config_names]
 *     resource_type => INT8
 *     resource_name => STRING
 *     config_names => STRING
 */

/**
 * @param {Array} resources An array of config resources to be returned
 */
module.exports = ({ resources }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'DescribeConfigs',
  encode: async () => {
    return new Encoder().writeArray(resources.map(encodeResource))
  },
})

const encodeResource = ({ type, name, configNames = [] }) => {
  return new Encoder()
    .writeInt8(type)
    .writeString(name)
    .writeNullableArray(configNames)
}
