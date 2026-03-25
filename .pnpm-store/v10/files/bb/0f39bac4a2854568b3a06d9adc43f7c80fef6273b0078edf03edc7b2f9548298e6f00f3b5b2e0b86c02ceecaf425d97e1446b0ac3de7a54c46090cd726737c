const Long = require('../../../../utils/long')
const HeaderDecoder = require('../../header/v0/decoder')
const TimestampTypes = require('../../../timestampTypes')

/**
 * v0
 * Record =>
 *   Length => Varint
 *   Attributes => Int8
 *   TimestampDelta => Varlong
 *   OffsetDelta => Varint
 *   Key => varInt|Bytes
 *   Value => varInt|Bytes
 *   Headers => [HeaderKey HeaderValue]
 *     HeaderKey => VarInt|String
 *     HeaderValue => VarInt|Bytes
 */

module.exports = (decoder, batchContext = {}) => {
  const {
    firstOffset,
    firstTimestamp,
    magicByte,
    isControlBatch = false,
    timestampType,
    maxTimestamp,
  } = batchContext
  const attributes = decoder.readInt8()

  const timestampDelta = decoder.readVarLong()
  const timestamp =
    timestampType === TimestampTypes.LOG_APPEND_TIME && maxTimestamp
      ? maxTimestamp
      : Long.fromValue(firstTimestamp)
          .add(timestampDelta)
          .toString()

  const offsetDelta = decoder.readVarInt()
  const offset = Long.fromValue(firstOffset)
    .add(offsetDelta)
    .toString()

  const key = decoder.readVarIntBytes()
  const value = decoder.readVarIntBytes()
  const headers = decoder.readVarIntArray(HeaderDecoder).reduce(
    (obj, { key, value }) => ({
      ...obj,
      [key]:
        obj[key] === undefined
          ? value
          : Array.isArray(obj[key])
          ? obj[key].concat([value])
          : [obj[key], value],
    }),
    {}
  )

  return {
    magicByte,
    attributes, // Record level attributes are presently unused
    timestamp,
    offset,
    key,
    value,
    headers,
    isControlRecord: isControlBatch,
    batchContext,
  }
}
