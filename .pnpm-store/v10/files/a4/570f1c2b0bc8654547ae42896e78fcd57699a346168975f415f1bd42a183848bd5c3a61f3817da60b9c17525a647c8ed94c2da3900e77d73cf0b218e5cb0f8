const { decode } = require('../v3/response')
const { KafkaJSMemberIdRequired } = require('../../../../errors')
const { failure, createErrorFromCode, errorCodes } = require('../../../error')

/**
 * JoinGroup Response (Version: 4) => throttle_time_ms error_code generation_id group_protocol leader_id member_id [members]
 *   throttle_time_ms => INT32
 *   error_code => INT16
 *   generation_id => INT32
 *   group_protocol => STRING
 *   leader_id => STRING
 *   member_id => STRING
 *   members => member_id member_metadata
 *     member_id => STRING
 *     member_metadata => BYTES
 */

const { code: MEMBER_ID_REQUIRED_ERROR_CODE } = errorCodes.find(
  e => e.type === 'MEMBER_ID_REQUIRED'
)

const parse = async data => {
  if (failure(data.errorCode)) {
    if (data.errorCode === MEMBER_ID_REQUIRED_ERROR_CODE) {
      throw new KafkaJSMemberIdRequired(createErrorFromCode(data.errorCode), {
        memberId: data.memberId,
      })
    }

    throw createErrorFromCode(data.errorCode)
  }

  return data
}

module.exports = {
  decode,
  parse,
}
