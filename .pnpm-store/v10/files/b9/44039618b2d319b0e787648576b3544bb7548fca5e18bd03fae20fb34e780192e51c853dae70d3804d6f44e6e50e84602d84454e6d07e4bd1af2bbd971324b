const Decoder = require('../../../decoder')
const { failure, createErrorFromCode } = require('../../../error')

/**
 * AlterConfigs Response (Version: 0) => throttle_time_ms [resources]
 *   throttle_time_ms => INT32
 *   resources => error_code error_message resource_type resource_name
 *     error_code => INT16
 *     error_message => NULLABLE_STRING
 *     resource_type => INT8
 *     resource_name => STRING
 */

const decodeResources = decoder => ({
  errorCode: decoder.readInt16(),
  errorMessage: decoder.readString(),
  resourceType: decoder.readInt8(),
  resourceName: decoder.readString(),
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

const parse = async data => {
  const resourcesWithError = data.resources.filter(({ errorCode }) => failure(errorCode))
  if (resourcesWithError.length > 0) {
    throw createErrorFromCode(resourcesWithError[0].errorCode)
  }

  return data
}

module.exports = {
  decode,
  parse,
}
