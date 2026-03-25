/* eslint-disable */

// Based on the kafka client 0.10.2 murmur2 implementation
// https://github.com/apache/kafka/blob/0.10.2/clients/src/main/java/org/apache/kafka/common/utils/Utils.java#L364

const SEED = 0x9747b28c

// 'm' and 'r' are mixing constants generated offline.
// They're not really 'magic', they just happen to work well.
const M = 0x5bd1e995
const R = 24

module.exports = key => {
  const data = Buffer.isBuffer(key) ? key : Buffer.from(String(key))
  const length = data.length

  // Initialize the hash to a random value
  let h = SEED ^ length
  let length4 = length / 4

  for (let i = 0; i < length4; i++) {
    const i4 = i * 4
    let k =
      (data[i4 + 0] & 0xff) +
      ((data[i4 + 1] & 0xff) << 8) +
      ((data[i4 + 2] & 0xff) << 16) +
      ((data[i4 + 3] & 0xff) << 24)
    k *= M
    k ^= k >>> R
    k *= M
    h *= M
    h ^= k
  }

  // Handle the last few bytes of the input array
  switch (length % 4) {
    case 3:
      h ^= (data[(length & ~3) + 2] & 0xff) << 16
    case 2:
      h ^= (data[(length & ~3) + 1] & 0xff) << 8
    case 1:
      h ^= data[length & ~3] & 0xff
      h *= M
  }

  h ^= h >>> 13
  h *= M
  h ^= h >>> 15

  return h
}
