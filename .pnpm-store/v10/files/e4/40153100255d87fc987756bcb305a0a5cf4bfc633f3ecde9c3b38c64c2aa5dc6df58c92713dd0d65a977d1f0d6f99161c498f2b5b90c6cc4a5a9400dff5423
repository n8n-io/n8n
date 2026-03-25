const {
  KafkaJSPartialMessageError,
  KafkaJSUnsupportedMagicByteInMessageSet,
} = require('../../errors')

const V0Decoder = require('./v0/decoder')
const V1Decoder = require('./v1/decoder')

const decodeMessage = (decoder, magicByte) => {
  switch (magicByte) {
    case 0:
      return V0Decoder(decoder)
    case 1:
      return V1Decoder(decoder)
    default:
      throw new KafkaJSUnsupportedMagicByteInMessageSet(
        `Unsupported MessageSet message version, magic byte: ${magicByte}`
      )
  }
}

module.exports = (offset, size, decoder) => {
  // Don't decrement decoder.offset because slice is already considering the current
  // offset of the decoder
  const remainingBytes = Buffer.byteLength(decoder.slice(size).buffer)

  if (remainingBytes < size) {
    throw new KafkaJSPartialMessageError(
      `Tried to decode a partial message: remainingBytes(${remainingBytes}) < messageSize(${size})`
    )
  }

  const crc = decoder.readInt32()
  const magicByte = decoder.readInt8()
  const message = decodeMessage(decoder, magicByte)
  return Object.assign({ offset, size, crc, magicByte }, message)
}
