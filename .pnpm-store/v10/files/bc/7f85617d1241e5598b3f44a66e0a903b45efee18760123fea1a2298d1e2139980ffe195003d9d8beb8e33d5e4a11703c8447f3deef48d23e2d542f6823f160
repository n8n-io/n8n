const Encoder = require('../../../encoder')
const { AlterConfigs: apiKey } = require('../../apiKeys')

/**
 * AlterConfigs Request (Version: 0) => [resources] validate_only
 *   resources => resource_type resource_name [config_entries]
 *     resource_type => INT8
 *     resource_name => STRING
 *     config_entries => config_name config_value
 *       config_name => STRING
 *       config_value => NULLABLE_STRING
 *   validate_only => BOOLEAN
 */

/**
 * @param {Array} resources An array of resources to change
 * @param {boolean} [validateOnly=false]
 */
module.exports = ({ resources, validateOnly = false }) => ({
  apiKey,
  apiVersion: 0,
  apiName: 'AlterConfigs',
  encode: async () => {
    return new Encoder().writeArray(resources.map(encodeResource)).writeBoolean(validateOnly)
  },
})

const encodeResource = ({ type, name, configEntries }) => {
  return new Encoder()
    .writeInt8(type)
    .writeString(name)
    .writeArray(configEntries.map(encodeConfigEntries))
}

const encodeConfigEntries = ({ name, value }) => {
  return new Encoder().writeString(name).writeString(value)
}
