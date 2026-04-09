/**
 * Module to generate seed based random numbers.
 *
 * @deprecated Internal. Use faker.datatype.number() or faker.seed() instead.
 */
export declare class MersenneModule {
    private gen;
    constructor();
    /**
     * Generates a random number between `[min, max)`.
     *
     * @param max The maximum number. Defaults to `32768`.
     * @param min The minimum number. Defaults to `0`.
     *
     * @example
     * faker.mersenne.rand() // 15515
     * faker.mersenne.rand(1000, 500) // 578
     *
     * @since 5.5.0
     */
    rand(max?: number, min?: number): number;
    /**
     * Sets the seed to use.
     *
     * @param S The seed to use.
     * @throws If the seed is not a `number`.
     *
     * @since 5.5.0
     */
    seed(S: number): void;
    /**
     * Sets the seed to use.
     *
     * @param A The seed to use.
     * @throws If the seed is not a `number[]`.
     *
     * @since 5.5.0
     */
    seed_array(A: number[]): void;
}
