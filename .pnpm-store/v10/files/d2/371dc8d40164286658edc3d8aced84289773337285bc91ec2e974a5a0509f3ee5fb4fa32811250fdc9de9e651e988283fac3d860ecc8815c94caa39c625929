/**
 * @module prng
 */

import { Xorshift32 } from './Xorshift32.js'
import * as binary from '../binary.js'

/**
 * This is a variant of xoroshiro128plus - the fastest full-period generator passing BigCrush without systematic failures.
 *
 * This implementation follows the idea of the original xoroshiro128plus implementation,
 * but is optimized for the JavaScript runtime. I.e.
 * * The operations are performed on 32bit integers (the original implementation works with 64bit values).
 * * The initial 128bit state is computed based on a 32bit seed and Xorshift32.
 * * This implementation returns two 32bit values based on the 64bit value that is computed by xoroshiro128plus.
 *   Caution: The last addition step works slightly different than in the original implementation - the add carry of the
 *   first 32bit addition is not carried over to the last 32bit.
 *
 * [Reference implementation](http://vigna.di.unimi.it/xorshift/xoroshiro128plus.c)
 */
export class Xoroshiro128plus {
  /**
   * @param {number} seed Unsigned 32 bit number
   */
  constructor (seed) {
    this.seed = seed
    // This is a variant of Xoroshiro128plus to fill the initial state
    const xorshift32 = new Xorshift32(seed)
    this.state = new Uint32Array(4)
    for (let i = 0; i < 4; i++) {
      this.state[i] = xorshift32.next() * binary.BITS32
    }
    this._fresh = true
  }

  /**
   * @return {number} Float/Double in [0,1)
   */
  next () {
    const state = this.state
    if (this._fresh) {
      this._fresh = false
      return ((state[0] + state[2]) >>> 0) / (binary.BITS32 + 1)
    } else {
      this._fresh = true
      const s0 = state[0]
      const s1 = state[1]
      const s2 = state[2] ^ s0
      const s3 = state[3] ^ s1
      // function js_rotl (x, k) {
      //   k = k - 32
      //   const x1 = x[0]
      //   const x2 = x[1]
      //   x[0] = x2 << k | x1 >>> (32 - k)
      //   x[1] = x1 << k | x2 >>> (32 - k)
      // }
      // rotl(s0, 55) // k = 23 = 55 - 32; j = 9 =  32 - 23
      state[0] = (s1 << 23 | s0 >>> 9) ^ s2 ^ (s2 << 14 | s3 >>> 18)
      state[1] = (s0 << 23 | s1 >>> 9) ^ s3 ^ (s3 << 14)
      // rol(s1, 36) // k = 4 = 36 - 32; j = 23 = 32 - 9
      state[2] = s3 << 4 | s2 >>> 28
      state[3] = s2 << 4 | s3 >>> 28
      return (((state[1] + state[3]) >>> 0) / (binary.BITS32 + 1))
    }
  }
}

/*
// Reference implementation
// Source: http://vigna.di.unimi.it/xorshift/xoroshiro128plus.c
// By David Blackman and Sebastiano Vigna
// Who published the reference implementation under Public Domain (CC0)

#include <stdint.h>
#include <stdio.h>

uint64_t s[2];

static inline uint64_t rotl(const uint64_t x, int k) {
    return (x << k) | (x >> (64 - k));
}

uint64_t next(void) {
    const uint64_t s0 = s[0];
    uint64_t s1 = s[1];
    s1 ^= s0;
    s[0] = rotl(s0, 55) ^ s1 ^ (s1 << 14); // a, b
    s[1] = rotl(s1, 36); // c
    return (s[0] + s[1]) & 0xFFFFFFFF;
}

int main(void)
{
    int i;
    s[0] = 1111 | (1337ul << 32);
    s[1] = 1234 | (9999ul << 32);

    printf("1000 outputs of genrand_int31()\n");
    for (i=0; i<100; i++) {
        printf("%10lu ", i);
        printf("%10lu ", next());
        printf("- %10lu ", s[0] >> 32);
        printf("%10lu ", (s[0] << 32) >> 32);
        printf("%10lu ", s[1] >> 32);
        printf("%10lu ", (s[1] << 32) >> 32);
        printf("\n");
        // if (i%5==4) printf("\n");
    }
    return 0;
}
*/
