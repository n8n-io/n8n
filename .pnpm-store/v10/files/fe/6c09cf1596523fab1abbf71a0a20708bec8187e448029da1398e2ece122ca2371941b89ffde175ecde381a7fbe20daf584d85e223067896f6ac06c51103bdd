//
//
//

'use strict';

/**
 * A bitset implementation, after that in java.util.  Yes there
 * already exist such things, but none implement next{Clear|Set}Bit or
 * equivalent, and none involved me tooling about for an evening.
 */
class BitSet {
  /**
   * @param {number} [size]
   */
  constructor(size) {
    if (size) {
      const numWords = Math.ceil(size / 32);
      this.words = new Array(numWords);
    }
    else {
      this.words = [];
    }
    this.wordsInUse = 0; // = number, not index
  }

  /**
   * @param {number} numWords
   */
  ensureSize(numWords) {
    const wordsPresent = this.words.length;
    if (wordsPresent < numWords) {
      this.words = this.words.concat(new Array(numWords - wordsPresent));
    }
  }

  /**
   * @param {number} bitIndex
   */
  set(bitIndex) {
    const w = wordIndex(bitIndex);
    if (w >= this.wordsInUse) {
      this.ensureSize(w + 1);
      this.wordsInUse = w + 1;
    }
    const bit = 1 << bitIndex;
    this.words[w] |= bit;
  }

  /**
   * @param {number} bitIndex
   */
  clear(bitIndex) {
    const w = wordIndex(bitIndex);
    if (w >= this.wordsInUse) return;
    const mask = ~(1 << bitIndex);
    this.words[w] &= mask;
  }

  /**
   * @param {number} bitIndex
   */
  get(bitIndex) {
    const w = wordIndex(bitIndex);
    if (w >= this.wordsInUse) return false; // >= since index vs size
    const bit = 1 << bitIndex;
    return !!(this.words[w] & bit);
  }

  /**
   * Give the next bit that is set on or after fromIndex, or -1 if no such bit
   *
   * @param {number} fromIndex
   */
  nextSetBit(fromIndex) {
    let w = wordIndex(fromIndex);
    if (w >= this.wordsInUse) return -1;

    // the right-hand side is shifted to only test the bits of the first
    // word that are > fromIndex
    let word = this.words[w] & (0xffffffff << fromIndex);
    while (true) {
      if (word) return (w * 32) + trailingZeros(word);
      w++;
      if (w === this.wordsInUse) return -1;
      word = this.words[w];
    }
  }

  /**
   * @param {number} fromIndex
   */
  nextClearBit(fromIndex) {
    let w = wordIndex(fromIndex);
    if (w >= this.wordsInUse) return fromIndex;

    let word = ~(this.words[w]) & (0xffffffff << fromIndex);
    while (true) {
      if (word) return (w * 32) + trailingZeros(word);
      w++;
      if (w == this.wordsInUse) return w * 32;
      word = ~(this.words[w]);
    }
  }
}

/**
 * @param {number} bitIndex
 */
function wordIndex(bitIndex) {
  return Math.floor(bitIndex / 32);
}

/**
 * @param {number} i
 */
function trailingZeros(i) {
  // From Hacker's Delight, via JDK. Probably far less effective here,
  // since bit ops are not necessarily the quick way to do things in
  // JS.
  if (i === 0) return 32;
  let y, n = 31;
  y = i << 16; if (y != 0) { n = n -16; i = y; }
  y = i << 8;  if (y != 0) { n = n - 8; i = y; }
  y = i << 4;  if (y != 0) { n = n - 4; i = y; }
  y = i << 2;  if (y != 0) { n = n - 2; i = y; }
  return n - ((i << 1) >>> 31);
}

module.exports.BitSet = BitSet;
