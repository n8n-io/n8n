const Encoder = require('../../encoder')
const crc32 = require('../../crc32')
const { Types: Compression, COMPRESSION_CODEC_MASK } = require('../compression')

/**
 * v1 (supported since 0.10.0)
 * Message => Crc MagicByte Attributes Key Value
 *   Crc => int32
 *   MagicByte => int8
 *   Attributes => int8
 *   Timestamp => int64
 *   Key => bytes
 *   Value => bytes
 */

module.exports = ({ compression = Compression.None, timestamp = Date.now(), key, value }) => {
  const content = new Encoder()
    .writeInt8(1) // magicByte
    .writeInt8(compression & COMPRESSION_CODEC_MASK)
    .writeInt64(timestamp)
    .writeBytes(key)
    .writeBytes(value)

  const crc = crc32(content)
  return new Encoder().writeInt32(crc).writeEncoder(content)
}
