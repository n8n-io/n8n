import { MonoTypeOperatorFunction } from '../types';
/**
 * Skip a specified number of values before the completion of an observable.
 *
 * ![](skipLast.png)
 *
 * Returns an observable that will emit values as soon as it can, given a number of
 * skipped values. For example, if you `skipLast(3)` on a source, when the source
 * emits its fourth value, the first value the source emitted will finally be emitted
 * from the returned observable, as it is no longer part of what needs to be skipped.
 *
 * All values emitted by the result of `skipLast(N)` will be delayed by `N` emissions,
 * as each value is held in a buffer until enough values have been emitted that that
 * the buffered value may finally be sent to the consumer.
 *
 * After subscribing, unsubscribing will not result in the emission of the buffered
 * skipped values.
 *
 * ## Example
 *
 * Skip the last 2 values of an observable with many values
 *
 * ```ts
 * import { of, skipLast } from 'rxjs';
 *
 * const numbers = of(1, 2, 3, 4, 5);
 * const skipLastTwo = numbers.pipe(skipLast(2));
 * skipLastTwo.subscribe(x => console.log(x));
 *
 * // Results in:
 * // 1 2 3
 * // (4 and 5 are skipped)
 * ```
 *
 * @see {@link skip}
 * @see {@link skipUntil}
 * @see {@link skipWhile}
 * @see {@link take}
 *
 * @param skipCount Number of elements to skip from the end of the source Observable.
 * @return A function that returns an Observable that skips the last `count`
 * values emitted by the source Observable.
 */
export declare function skipLast<T>(skipCount: number): MonoTypeOperatorFunction<T>;
//# sourceMappingURL=skipLast.d.ts.map