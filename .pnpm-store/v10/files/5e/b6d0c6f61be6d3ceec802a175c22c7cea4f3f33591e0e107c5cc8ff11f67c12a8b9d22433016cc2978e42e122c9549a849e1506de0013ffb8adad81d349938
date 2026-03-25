/**
 * Interface for a random number generator.
 *
 * **Note:** Normally there is no need to implement this interface directly,
 * unless you want to achieve a specific goal with it.
 *
 * This interface enables you to use random generators from third party libraries such as [pure-rand](https://github.com/dubzzz/pure-rand).
 *
 * Instances are expected to be ready for use before being passed to any Faker constructor,
 * this includes being `seed()`ed with either a random or fixed value.
 *
 * For more information please refer to the [documentation](/api/randomizer).
 *
 * @example
 * import { Faker, Randomizer, SimpleFaker } from '@faker-js/faker';
 * import { RandomGenerator, xoroshiro128plus } from 'pure-rand';
 *
 * function generatePureRandRandomizer(
 *   seed: number | number[] = Date.now() ^ (Math.random() * 0x100000000),
 *   factory: (seed: number) => RandomGenerator = xoroshiro128plus
 * ): Randomizer {
 *   const self = {
 *     next: () => (self.generator.unsafeNext() >>> 0) / 0x100000000,
 *     seed: (seed: number | number[]) => {
 *       self.generator = factory(typeof seed === 'number' ? seed : seed[0]);
 *     },
 *   } as Randomizer & { generator: RandomGenerator };
 *   self.seed(seed);
 *   return self;
 * }
 *
 * const randomizer = generatePureRandRandomizer();
 *
 * const simpleFaker = new SimpleFaker({ randomizer });
 *
 * const faker = new Faker({
 *   locale: ...,
 *   randomizer,
 * });
 *
 * @since 8.2.0
 */
export interface Randomizer {
    /**
     * Generates a random float between 0 (inclusive) and 1 (exclusive).
     *
     * @example
     * randomizer.next() // 0.3404027920160495
     * randomizer.next() // 0.929890375900335
     * randomizer.next() // 0.5866362918861691
     *
     * @since 8.2.0
     */
    next(): number;
    /**
     * Sets the seed to use.
     *
     * @param seed The seed to use.
     *
     * @example
     * // Random seeds
     * randomizer.seed(Date.now() ^ (Math.random() * 0x100000000));
     * // Fixed seeds (for reproducibility)
     * randomizer.seed(42);
     * randomizer.seed([42, 13.37]);
     *
     * @since 8.2.0
     */
    seed(seed: number | number[]): void;
}
