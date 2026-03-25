const Decoder = require('../../../decoder')
const { failure, createErrorFromCode } = require('../../../error')

/**
 * DeleteAcls Response (Version: 0) => throttle_time_ms [filter_responses]
 *   throttle_time_ms => INT32
 *   filter_responses => error_code error_message [matching_acls]
 *     error_code => INT16
 *     error_message => NULLABLE_STRING
 *     matching_acls => error_code error_message resource_type resource_name principal host operation permission_type
 *       error_code => INT16
 *       error_message => NULLABLE_STRING
 *       resource_type => INT8
 *       resource_name => STRING
 *       principal => STRING
 *       host => STRING
 *       operation => INT8
 *       permission_type => INT8
 */

const decodeMatchingAcls = decoder => ({
  errorCode: decoder.readInt16(),
  errorMessage: decoder.readString(),
  resourceType: decoder.readInt8(),
  resourceName: decoder.readString(),
  principal: decoder.readString(),
  host: decoder.readString(),
  operation: decoder.readInt8(),
  permissionType: decoder.readInt8(),
})

const decodeFilterResponse = decoder => ({
  errorCode: decoder.readInt16(),
  errorMessage: decoder.readString(),
  matchingAcls: decoder.readArray(decodeMatchingAcls),
})

const decode = async rawData => {
  const decoder = new Decoder(rawData)
  const throttleTime = decoder.readInt32()
  const filterResponses = decoder.readArray(decodeFilterResponse)

  return {
    throttleTime,
    filterResponses,
  }
}

const parse = async data => {
  const filterResponsesWithError = data.filterResponses.filter(({ errorCode }) =>
    failure(errorCode)
  )

  if (filterResponsesWithError.length > 0) {
    throw createErrorFromCode(filterResponsesWithError[0].errorCode)
  }

  for (const filterResponse of data.filterResponses) {
    const matchingAcls = filterResponse.matchingAcls
    const matchingAclsWithError = matchingAcls.filter(({ errorCode }) => failure(errorCode))

    if (matchingAclsWithError.length > 0) {
      throw createErrorFromCode(matchingAclsWithError[0].errorCode)
    }
  }

  return data
}

module.exports = {
  decodeMatchingAcls,
  decodeFilterResponse,
  decode,
  parse,
}
