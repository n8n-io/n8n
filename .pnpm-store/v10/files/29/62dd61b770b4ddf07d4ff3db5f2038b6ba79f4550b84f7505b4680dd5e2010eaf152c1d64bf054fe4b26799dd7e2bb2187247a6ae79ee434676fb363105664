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
    constructor(seed: number);
    seed: number;
    state: Uint32Array<ArrayBuffer>;
    _fresh: boolean;
    /**
     * @return {number} Float/Double in [0,1)
     */
    next(): number;
}
//# sourceMappingURL=Xoroshiro128plus.d.ts.map