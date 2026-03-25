const { decode, parse } = require('../v1/response')

/**
 * Fetch Response (Version: 2) => throttle_time_ms [responses]
 *  throttle_time_ms => INT32
 *  responses => topic [partition_responses]
 *    topic => STRING
 *    partition_responses => partition_header record_set
 *      partition_header => partition error_code high_watermark
 *        partition => INT32
 *        error_code => INT16
 *        high_watermark => INT64
 *      record_set => RECORDS
 */

module.exports = {
  decode,
  parse,
}
