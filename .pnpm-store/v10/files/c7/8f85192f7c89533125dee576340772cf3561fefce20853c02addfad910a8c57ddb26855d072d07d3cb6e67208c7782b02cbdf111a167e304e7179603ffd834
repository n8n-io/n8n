/* eslint-env browser */
const perf = typeof performance === 'undefined' ? null : performance

const isoCrypto = typeof crypto === 'undefined' ? null : crypto

/**
 * @type {function(number):ArrayBuffer}
 */
const cryptoRandomBuffer = isoCrypto !== null
  ? len => {
    // browser
    const buf = new ArrayBuffer(len)
    const arr = new Uint8Array(buf)
    isoCrypto.getRandomValues(arr)
    return buf
  }
  : len => {
    // polyfill
    const buf = new ArrayBuffer(len)
    const arr = new Uint8Array(buf)
    for (let i = 0; i < len; i++) {
      arr[i] = Math.ceil((Math.random() * 0xFFFFFFFF) >>> 0)
    }
    return buf
  }

exports.performance = perf
exports.cryptoRandomBuffer = cryptoRandomBuffer
