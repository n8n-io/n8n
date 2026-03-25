const { parse, decode } = require('../v0/response')

/**
 * OffsetCommit Response (Version: 1) => [responses]
 *   responses => topic [partition_responses]
 *     topic => STRING
 *     partition_responses => partition error_code
 *       partition => INT32
 *       error_code => INT16
 */

module.exports = {
  decode,
  parse,
}
