const { Buffer } = require('buffer')
const max = 65536
const cache = {}

// in node 6 Buffer.subarray returns a Uint8Array instead of a Buffer
// later versions return a Buffer
// alternative is Buffer.slice but that creates a new buffer
// creating new buffers takes time
// SubOk is only false on node < 8
const SubOk = Buffer.isBuffer(Buffer.from([1, 2]).subarray(0, 1))

function generateBuffer (i) {
  const buffer = Buffer.allocUnsafe(2)
  buffer.writeUInt8(i >> 8, 0)
  buffer.writeUInt8(i & 0x00FF, 0 + 1)

  return buffer
}

function generateCache () {
  for (let i = 0; i < max; i++) {
    cache[i] = generateBuffer(i)
  }
}

function genBufVariableByteInt (num) {
  const maxLength = 4 // max 4 bytes
  let digit = 0
  let pos = 0
  const buffer = Buffer.allocUnsafe(maxLength)

  do {
    digit = num % 128 | 0
    num = num / 128 | 0
    if (num > 0) digit = digit | 0x80

    buffer.writeUInt8(digit, pos++)
  } while (num > 0 && pos < maxLength)

  if (num > 0) {
    pos = 0
  }

  return SubOk ? buffer.subarray(0, pos) : buffer.slice(0, pos)
}

function generate4ByteBuffer (num) {
  const buffer = Buffer.allocUnsafe(4)
  buffer.writeUInt32BE(num, 0)
  return buffer
}

module.exports = {
  cache,
  generateCache,
  generateNumber: generateBuffer,
  genBufVariableByteInt,
  generate4ByteBuffer
}
