import * as binary from '../binary.js'
import * as math from '../math.js'

/**
 * @module prng
 */
const N = 624
const M = 397

/**
 * @param {number} u
 * @param {number} v
 */
const twist = (u, v) => ((((u & 0x80000000) | (v & 0x7fffffff)) >>> 1) ^ ((v & 1) ? 0x9908b0df : 0))

/**
 * @param {Uint32Array} state
 */
const nextState = state => {
  let p = 0
  let j
  for (j = N - M + 1; --j; p++) {
    state[p] = state[p + M] ^ twist(state[p], state[p + 1])
  }
  for (j = M; --j; p++) {
    state[p] = state[p + M - N] ^ twist(state[p], state[p + 1])
  }
  state[p] = state[p + M - N] ^ twist(state[p], state[0])
}

/**
 * This is a port of Shawn Cokus's implementation of the original Mersenne Twister algorithm (http://www.math.sci.hiroshima-u.ac.jp/~m-mat/MT/MT2002/CODES/MTARCOK/mt19937ar-cok.c).
 * MT has a very high period of 2^19937. Though the authors of xorshift describe that a high period is not
 * very relevant (http://vigna.di.unimi.it/xorshift/). It is four times slower than xoroshiro128plus and
 * needs to recompute its state after generating 624 numbers.
 *
 * ```js
 * const gen = new Mt19937(new Date().getTime())
 * console.log(gen.next())
 * ```
 *
 * @public
 */
export class Mt19937 {
  /**
   * @param {number} seed Unsigned 32 bit number
   */
  constructor (seed) {
    this.seed = seed
    const state = new Uint32Array(N)
    state[0] = seed
    for (let i = 1; i < N; i++) {
      state[i] = (math.imul(1812433253, (state[i - 1] ^ (state[i - 1] >>> 30))) + i) & binary.BITS32
    }
    this._state = state
    this._i = 0
    nextState(this._state)
  }

  /**
   * Generate a random signed integer.
   *
   * @return {Number} A 32 bit signed integer.
   */
  next () {
    if (this._i === N) {
      // need to compute a new state
      nextState(this._state)
      this._i = 0
    }
    let y = this._state[this._i++]
    y ^= (y >>> 11)
    y ^= (y << 7) & 0x9d2c5680
    y ^= (y << 15) & 0xefc60000
    y ^= (y >>> 18)
    return (y >>> 0) / (binary.BITS32 + 1)
  }
}
