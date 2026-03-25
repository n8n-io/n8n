const { parse, decode } = require('../v0/response')

/**
 * JoinGroup Response (Version: 1) => error_code generation_id group_protocol leader_id member_id [members]
 *   error_code => INT16
 *   generation_id => INT32
 *   group_protocol => STRING
 *   leader_id => STRING
 *   member_id => STRING
 *   members => member_id member_metadata
 *     member_id => STRING
 *     member_metadata => BYTES
 */

module.exports = {
  decode,
  parse,
}
