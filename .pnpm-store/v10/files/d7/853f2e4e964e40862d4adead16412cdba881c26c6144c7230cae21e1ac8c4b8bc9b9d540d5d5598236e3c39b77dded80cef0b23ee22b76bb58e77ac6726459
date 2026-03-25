const Decoder = require('../../../decoder')
const { failure, createErrorFromCode } = require('../../../error')

/**
 * DescribeGroups Response (Version: 0) => [groups]
 *   groups => error_code group_id state protocol_type protocol [members]
 *     error_code => INT16
 *     group_id => STRING
 *     state => STRING
 *     protocol_type => STRING
 *     protocol => STRING
 *     members => member_id client_id client_host member_metadata member_assignment
 *       member_id => STRING
 *       client_id => STRING
 *       client_host => STRING
 *       member_metadata => BYTES
 *       member_assignment => BYTES
 */

const decoderMember = decoder => ({
  memberId: decoder.readString(),
  clientId: decoder.readString(),
  clientHost: decoder.readString(),
  memberMetadata: decoder.readBytes(),
  memberAssignment: decoder.readBytes(),
})

const decodeGroup = decoder => ({
  errorCode: decoder.readInt16(),
  groupId: decoder.readString(),
  state: decoder.readString(),
  protocolType: decoder.readString(),
  protocol: decoder.readString(),
  members: decoder.readArray(decoderMember),
})

const decode = async rawData => {
  const decoder = new Decoder(rawData)
  const groups = decoder.readArray(decodeGroup)

  return {
    groups,
  }
}

const parse = async data => {
  const groupsWithError = data.groups.filter(({ errorCode }) => failure(errorCode))
  if (groupsWithError.length > 0) {
    throw createErrorFromCode(groupsWithError[0].errorCode)
  }

  return data
}

module.exports = {
  decode,
  parse,
}
