/**
 * It is not recommended to use this package. This is the uncached implementation of the rabin
 * fingerprint algorithm. However, it can be used to verify the `rabin.js` implementation.
 *
 * @module rabin-uncached
 */

import * as math from '../math.js'
import * as buffer from '../buffer.js'

export class RabinUncachedEncoder {
  /**
   * @param {Uint8Array} m assert(m[0] === 1)
   */
  constructor (m) {
    this.m = m
    this.blen = m.byteLength
    this.bs = new Uint8Array(this.blen)
    /**
     * This describes the position of the most significant byte (starts with 0 and increases with
     * shift)
     */
    this.bpos = 0
  }

  /**
   * Add/Xor/Substract bytes.
   *
   * Discards bytes that are out of range.
   * @todo put this in function or inline
   *
   * @param {Uint8Array} cs
   */
  add (cs) {
    const copyLen = math.min(this.blen, cs.byteLength)
    // copy from right to left until max is reached
    for (let i = 0; i < copyLen; i++) {
      this.bs[(this.bpos + this.blen - i - 1) % this.blen] ^= cs[cs.byteLength - i - 1]
    }
  }

  /**
   * @param {number} byte
   */
  write (byte) {
    // [0,m1,m2,b]
    //  x            <- bpos
    // Shift one byte to the left, add b
    this.bs[this.bpos] = byte
    this.bpos = (this.bpos + 1) % this.blen
    // mod
    for (let i = 7; i >= 0; i--) {
      if (((this.bs[this.bpos] >>> i) & 1) === 1) {
        this.add(buffer.shiftNBitsLeft(this.m, i))
      }
    }
    // if (this.bs[this.bpos] !== 0) { error.unexpectedCase() }
    // assert(this.bs[this.bpos] === 0)
  }

  getFingerprint () {
    const result = new Uint8Array(this.blen - 1)
    for (let i = 0; i < result.byteLength; i++) {
      result[i] = this.bs[(this.bpos + i + 1) % this.blen]
    }
    return result
  }
}
