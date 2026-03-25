const Decoder = require('../../../decoder')
const { parse: parseV0 } = require('../v0/response')

/**
 * Starting in version 1, on quota violation, brokers send out responses before throttling.
 * @see https://cwiki.apache.org/confluence/display/KAFKA/KIP-219+-+Improve+quota+communication
 * Version 1 also introduces a new resource pattern type field.
 * @see https://cwiki.apache.org/confluence/display/KAFKA/KIP-290%3A+Support+for+Prefixed+ACLs
 *
 * DeleteAcls Response (Version: 1) => throttle_time_ms [filter_responses]
 *   throttle_time_ms => INT32
 *   filter_responses => error_code error_message [matching_acls]
 *     error_code => INT16
 *     error_message => NULLABLE_STRING
 *     matching_acls => error_code error_message resource_type resource_name resource_pattern_type principal host operation permission_type
 *       error_code => INT16
 *       error_message => NULLABLE_STRING
 *       resource_type => INT8
 *       resource_name => STRING
 *       resource_pattern_type => INT8
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
  resourcePatternType: decoder.readInt8(),
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
    throttleTime: 0,
    clientSideThrottleTime: throttleTime,
    filterResponses,
  }
}

module.exports = {
  decode,
  parse: parseV0,
}
