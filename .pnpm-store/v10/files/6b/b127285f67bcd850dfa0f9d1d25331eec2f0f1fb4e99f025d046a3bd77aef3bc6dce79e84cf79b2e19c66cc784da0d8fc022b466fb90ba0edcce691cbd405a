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
    constructor(seed: number);
    seed: number;
    _state: Uint32Array<ArrayBuffer>;
    _i: number;
    /**
     * Generate a random signed integer.
     *
     * @return {Number} A 32 bit signed integer.
     */
    next(): number;
}
//# sourceMappingURL=Mt19937.d.ts.map