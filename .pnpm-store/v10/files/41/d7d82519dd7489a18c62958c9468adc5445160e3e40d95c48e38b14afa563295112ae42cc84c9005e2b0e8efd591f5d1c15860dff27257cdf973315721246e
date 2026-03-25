/* eslint-disable */
const Long = require('../../../utils/long')

// Based on the kafka client 0.10.2 murmur2 implementation
// https://github.com/apache/kafka/blob/0.10.2/clients/src/main/java/org/apache/kafka/common/utils/Utils.java#L364

const SEED = Long.fromValue(0x9747b28c)

// 'm' and 'r' are mixing constants generated offline.
// They're not really 'magic', they just happen to work well.
const M = Long.fromValue(0x5bd1e995)
const R = Long.fromValue(24)

module.exports = key => {
  const data = Buffer.isBuffer(key) ? key : Buffer.from(String(key))
  const length = data.length

  // Initialize the hash to a random value
  let h = Long.fromValue(SEED.xor(length))
  let length4 = Math.floor(length / 4)

  for (let i = 0; i < length4; i++) {
    const i4 = i * 4
    let k =
      (data[i4 + 0] & 0xff) +
      ((data[i4 + 1] & 0xff) << 8) +
      ((data[i4 + 2] & 0xff) << 16) +
      ((data[i4 + 3] & 0xff) << 24)
    k = Long.fromValue(k)
    k = k.multiply(M)
    k = k.xor(k.toInt() >>> R)
    k = Long.fromValue(k).multiply(M)
    h = h.multiply(M)
    h = h.xor(k)
  }

  // Handle the last few bytes of the input array
  switch (length % 4) {
    case 3:
      h = h.xor((data[(length & ~3) + 2] & 0xff) << 16)
    case 2:
      h = h.xor((data[(length & ~3) + 1] & 0xff) << 8)
    case 1:
      h = h.xor(data[length & ~3] & 0xff)
      h = h.multiply(M)
  }

  h = h.xor(h.toInt() >>> 13)
  h = h.multiply(M)
  h = h.xor(h.toInt() >>> 15)

  return h.toInt()
}
