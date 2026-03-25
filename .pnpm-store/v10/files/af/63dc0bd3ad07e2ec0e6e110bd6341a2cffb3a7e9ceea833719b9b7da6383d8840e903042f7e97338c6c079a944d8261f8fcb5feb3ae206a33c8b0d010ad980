'use strict';

var binary = require('./binary-ac8e39e2.cjs');
var string = require('./string-fddc5f8b.cjs');
var math = require('./math-96d5e8c4.cjs');
var buffer = require('./buffer-3e750729.cjs');

/**
 * @module prng
 */

/**
 * Xorshift32 is a very simple but elegang PRNG with a period of `2^32-1`.
 */
class Xorshift32 {
  /**
   * @param {number} seed Unsigned 32 bit number
   */
  constructor (seed) {
    this.seed = seed;
    /**
     * @type {number}
     */
    this._state = seed;
  }

  /**
   * Generate a random signed integer.
   *
   * @return {Number} A 32 bit signed integer.
   */
  next () {
    let x = this._state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    this._state = x;
    return (x >>> 0) / (binary.BITS32 + 1)
  }
}

/**
 * @module prng
 */

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
class Xoroshiro128plus {
  /**
   * @param {number} seed Unsigned 32 bit number
   */
  constructor (seed) {
    this.seed = seed;
    // This is a variant of Xoroshiro128plus to fill the initial state
    const xorshift32 = new Xorshift32(seed);
    this.state = new Uint32Array(4);
    for (let i = 0; i < 4; i++) {
      this.state[i] = xorshift32.next() * binary.BITS32;
    }
    this._fresh = true;
  }

  /**
   * @return {number} Float/Double in [0,1)
   */
  next () {
    const state = this.state;
    if (this._fresh) {
      this._fresh = false;
      return ((state[0] + state[2]) >>> 0) / (binary.BITS32 + 1)
    } else {
      this._fresh = true;
      const s0 = state[0];
      const s1 = state[1];
      const s2 = state[2] ^ s0;
      const s3 = state[3] ^ s1;
      // function js_rotl (x, k) {
      //   k = k - 32
      //   const x1 = x[0]
      //   const x2 = x[1]
      //   x[0] = x2 << k | x1 >>> (32 - k)
      //   x[1] = x1 << k | x2 >>> (32 - k)
      // }
      // rotl(s0, 55) // k = 23 = 55 - 32; j = 9 =  32 - 23
      state[0] = (s1 << 23 | s0 >>> 9) ^ s2 ^ (s2 << 14 | s3 >>> 18);
      state[1] = (s0 << 23 | s1 >>> 9) ^ s3 ^ (s3 << 14);
      // rol(s1, 36) // k = 4 = 36 - 32; j = 23 = 32 - 9
      state[2] = s3 << 4 | s2 >>> 28;
      state[3] = s2 << 4 | s3 >>> 28;
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

/**
 * Fast Pseudo Random Number Generators.
 *
 * Given a seed a PRNG generates a sequence of numbers that cannot be reasonably predicted.
 * Two PRNGs must generate the same random sequence of numbers if  given the same seed.
 *
 * @module prng
 */

/**
 * Description of the function
 *  @callback generatorNext
 *  @return {number} A random float in the cange of [0,1)
 */

/**
 * A random type generator.
 *
 * @typedef {Object} PRNG
 * @property {generatorNext} next Generate new number
 */
const DefaultPRNG = Xoroshiro128plus;

/**
 * Create a Xoroshiro128plus Pseudo-Random-Number-Generator.
 * This is the fastest full-period generator passing BigCrush without systematic failures.
 * But there are more PRNGs available in ./PRNG/.
 *
 * @param {number} seed A positive 32bit integer. Do not use negative numbers.
 * @return {PRNG}
 */
const create = seed => new DefaultPRNG(seed);

/**
 * Generates a single random bool.
 *
 * @param {PRNG} gen A random number generator.
 * @return {Boolean} A random boolean
 */
const bool = gen => (gen.next() >= 0.5);

/**
 * Generates a random integer with 53 bit resolution.
 *
 * @param {PRNG} gen A random number generator.
 * @param {Number} min The lower bound of the allowed return values (inclusive).
 * @param {Number} max The upper bound of the allowed return values (inclusive).
 * @return {Number} A random integer on [min, max]
 */
const int53 = (gen, min, max) => math.floor(gen.next() * (max + 1 - min) + min);

/**
 * Generates a random integer with 53 bit resolution.
 *
 * @param {PRNG} gen A random number generator.
 * @param {Number} min The lower bound of the allowed return values (inclusive).
 * @param {Number} max The upper bound of the allowed return values (inclusive).
 * @return {Number} A random integer on [min, max]
 */
const uint53 = (gen, min, max) => math.abs(int53(gen, min, max));

/**
 * Generates a random integer with 32 bit resolution.
 *
 * @param {PRNG} gen A random number generator.
 * @param {Number} min The lower bound of the allowed return values (inclusive).
 * @param {Number} max The upper bound of the allowed return values (inclusive).
 * @return {Number} A random integer on [min, max]
 */
const int32 = (gen, min, max) => math.floor(gen.next() * (max + 1 - min) + min);

/**
 * Generates a random integer with 53 bit resolution.
 *
 * @param {PRNG} gen A random number generator.
 * @param {Number} min The lower bound of the allowed return values (inclusive).
 * @param {Number} max The upper bound of the allowed return values (inclusive).
 * @return {Number} A random integer on [min, max]
 */
const uint32 = (gen, min, max) => int32(gen, min, max) >>> 0;

/**
 * @deprecated
 * Optimized version of prng.int32. It has the same precision as prng.int32, but should be preferred when
 * openaring on smaller ranges.
 *
 * @param {PRNG} gen A random number generator.
 * @param {Number} min The lower bound of the allowed return values (inclusive).
 * @param {Number} max The upper bound of the allowed return values (inclusive). The max inclusive number is `binary.BITS31-1`
 * @return {Number} A random integer on [min, max]
 */
const int31 = (gen, min, max) => int32(gen, min, max);

/**
 * Generates a random real on [0, 1) with 53 bit resolution.
 *
 * @param {PRNG} gen A random number generator.
 * @return {Number} A random real number on [0, 1).
 */
const real53 = gen => gen.next(); // (((gen.next() >>> 5) * binary.BIT26) + (gen.next() >>> 6)) / MAX_SAFE_INTEGER

/**
 * Generates a random character from char code 32 - 126. I.e. Characters, Numbers, special characters, and Space:
 *
 * @param {PRNG} gen A random number generator.
 * @return {string}
 *
 * (Space)!"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[/]^_`abcdefghijklmnopqrstuvwxyz{|}~
 */
const char = gen => string.fromCharCode(int31(gen, 32, 126));

/**
 * @param {PRNG} gen
 * @return {string} A single letter (a-z)
 */
const letter = gen => string.fromCharCode(int31(gen, 97, 122));

/**
 * @param {PRNG} gen
 * @param {number} [minLen=0]
 * @param {number} [maxLen=20]
 * @return {string} A random word (0-20 characters) without spaces consisting of letters (a-z)
 */
const word = (gen, minLen = 0, maxLen = 20) => {
  const len = int31(gen, minLen, maxLen);
  let str = '';
  for (let i = 0; i < len; i++) {
    str += letter(gen);
  }
  return str
};

/**
 * TODO: this function produces invalid runes. Does not cover all of utf16!!
 *
 * @param {PRNG} gen
 * @return {string}
 */
const utf16Rune = gen => {
  const codepoint = int31(gen, 0, 256);
  return string.fromCodePoint(codepoint)
};

/**
 * @param {PRNG} gen
 * @param {number} [maxlen = 20]
 */
const utf16String = (gen, maxlen = 20) => {
  const len = int31(gen, 0, maxlen);
  let str = '';
  for (let i = 0; i < len; i++) {
    str += utf16Rune(gen);
  }
  return str
};

/**
 * Returns one element of a given array.
 *
 * @param {PRNG} gen A random number generator.
 * @param {Array<T>} array Non empty Array of possible values.
 * @return {T} One of the values of the supplied Array.
 * @template T
 */
const oneOf = (gen, array) => array[int31(gen, 0, array.length - 1)];

/**
 * @param {PRNG} gen
 * @param {number} len
 * @return {Uint8Array<ArrayBuffer>}
 */
const uint8Array = (gen, len) => {
  const buf = buffer.createUint8ArrayFromLen(len);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = int32(gen, 0, binary.BITS8);
  }
  return buf
};

/* c8 ignore start */
/**
 * @param {PRNG} gen
 * @param {number} len
 * @return {Uint16Array}
 */
const uint16Array = (gen, len) => new Uint16Array(uint8Array(gen, len * 2).buffer);

/**
 * @param {PRNG} gen
 * @param {number} len
 * @return {Uint32Array}
 */
const uint32Array = (gen, len) => new Uint32Array(uint8Array(gen, len * 4).buffer);
/* c8 ignore stop */

var prng = /*#__PURE__*/Object.freeze({
  __proto__: null,
  DefaultPRNG: DefaultPRNG,
  create: create,
  bool: bool,
  int53: int53,
  uint53: uint53,
  int32: int32,
  uint32: uint32,
  int31: int31,
  real53: real53,
  char: char,
  letter: letter,
  word: word,
  utf16Rune: utf16Rune,
  utf16String: utf16String,
  oneOf: oneOf,
  uint8Array: uint8Array,
  uint16Array: uint16Array,
  uint32Array: uint32Array
});

exports.DefaultPRNG = DefaultPRNG;
exports.bool = bool;
exports.char = char;
exports.create = create;
exports.int31 = int31;
exports.int32 = int32;
exports.int53 = int53;
exports.letter = letter;
exports.oneOf = oneOf;
exports.prng = prng;
exports.real53 = real53;
exports.uint16Array = uint16Array;
exports.uint32 = uint32;
exports.uint32Array = uint32Array;
exports.uint53 = uint53;
exports.uint8Array = uint8Array;
exports.utf16Rune = utf16Rune;
exports.utf16String = utf16String;
exports.word = word;
//# sourceMappingURL=prng-37d48618.cjs.map
