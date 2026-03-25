const Decoder = require('../../../decoder')
const { parse: parseV0 } = require('../v0/response')
const { DEFAULT_CONFIG } = require('../../../configSource')

/**
 * DescribeConfigs Response (Version: 1) => throttle_time_ms [resources]
 *   throttle_time_ms => INT32
 *   resources => error_code error_message resource_type resource_name [config_entries]
 *     error_code => INT16
 *     error_message => NULLABLE_STRING
 *     resource_type => INT8
 *     resource_name => STRING
 *     config_entries => config_name config_value read_only config_source is_sensitive [config_synonyms]
 *       config_name => STRING
 *       config_value => NULLABLE_STRING
 *       read_only => BOOLEAN
 *       config_source => INT8
 *       is_sensitive => BOOLEAN
 *       config_synonyms => config_name config_value config_source
 *         config_name => STRING
 *         config_value => NULLABLE_STRING
 *         config_source => INT8
 */

const decodeSynonyms = decoder => ({
  configName: decoder.readString(),
  configValue: decoder.readString(),
  configSource: decoder.readInt8(),
})

const decodeConfigEntries = decoder => {
  const configName = decoder.readString()
  const configValue = decoder.readString()
  const readOnly = decoder.readBoolean()
  const configSource = decoder.readInt8()
  const isSensitive = decoder.readBoolean()
  const configSynonyms = decoder.readArray(decodeSynonyms)

  return {
    configName,
    configValue,
    readOnly,
    isDefault: configSource === DEFAULT_CONFIG,
    configSource,
    isSensitive,
    configSynonyms,
  }
}

const decodeResources = decoder => ({
  errorCode: decoder.readInt16(),
  errorMessage: decoder.readString(),
  resourceType: decoder.readInt8(),
  resourceName: decoder.readString(),
  configEntries: decoder.readArray(decodeConfigEntries),
})

const decode = async rawData => {
  const decoder = new Decoder(rawData)
  const throttleTime = decoder.readInt32()
  const resources = decoder.readArray(decodeResources)

  return {
    throttleTime,
    resources,
  }
}

module.exports = {
  decode,
  parse: parseV0,
}
