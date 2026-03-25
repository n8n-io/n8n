const Decoder = require('../../../decoder')
const { failIfVersionNotSupported } = require('../../../error')
const { parse: parseV0 } = require('../v0/response')

/**
 * ApiVersions Response (Version: 1) => error_code [api_versions] throttle_time_ms
 *   error_code => INT16
 *   api_versions => api_key min_version max_version
 *     api_key => INT16
 *     min_version => INT16
 *     max_version => INT16
 *   throttle_time_ms => INT32
 */

const apiVersion = decoder => ({
  apiKey: decoder.readInt16(),
  minVersion: decoder.readInt16(),
  maxVersion: decoder.readInt16(),
})

const decode = async rawData => {
  const decoder = new Decoder(rawData)
  const errorCode = decoder.readInt16()

  failIfVersionNotSupported(errorCode)

  const apiVersions = decoder.readArray(apiVersion)

  /**
   * The Java client defaults this value to 0 if not present,
   * even though it is required in the protocol. This is to
   * work around https://github.com/tulios/kafkajs/issues/491
   *
   * See:
   * https://github.com/apache/kafka/blob/trunk/clients/src/main/java/org/apache/kafka/common/protocol/CommonFields.java#L23-L25
   */
  const throttleTime = decoder.canReadInt32() ? decoder.readInt32() : 0

  return {
    errorCode,
    apiVersions,
    throttleTime,
  }
}

module.exports = {
  decode,
  parse: parseV0,
}
