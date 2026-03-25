import { scanInternals } from './scanInternals';
import { OperatorFunction } from '../types';
import { operate } from '../util/lift';

export function reduce<V, A = V>(accumulator: (acc: A | V, value: V, index: number) => A): OperatorFunction<V, V | A>;
export function reduce<V, A>(accumulator: (acc: A, value: V, index: number) => A, seed: A): OperatorFunction<V, A>;
export function reduce<V, A, S = A>(accumulator: (acc: A | S, value: V, index: number) => A, seed: S): OperatorFunction<V, A>;

/**
 * Applies an accumulator function over the source Observable, and returns the
 * accumulated result when the source completes, given an optional seed value.
 *
 * <span class="informal">Combines together all values emitted on the source,
 * using an accumulator function that knows how to join a new source value into
 * the accumulation from the past.</span>
 *
 * ![](reduce.png)
 *
 * Like
 * [Array.prototype.reduce()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce),
 * `reduce` applies an `accumulator` function against an accumulation and each
 * value of the source Observable (from the past) to reduce it to a single
 * value, emitted on the output Observable. Note that `reduce` will only emit
 * one value, only when the source Observable completes. It is equivalent to
 * applying operator {@link scan} followed by operator {@link last}.
 *
 * Returns an Observable that applies a specified `accumulator` function to each
 * item emitted by the source Observable. If a `seed` value is specified, then
 * that value will be used as the initial value for the accumulator. If no seed
 * value is specified, the first item of the source is used as the seed.
 *
 * ## Example
 *
 * Count the number of click events that happened in 5 seconds
 *
 * ```ts
 * import { fromEvent, takeUntil, interval, map, reduce } from 'rxjs';
 *
 * const clicksInFiveSeconds = fromEvent(document, 'click')
 *   .pipe(takeUntil(interval(5000)));
 *
 * const ones = clicksInFiveSeconds.pipe(map(() => 1));
 * const seed = 0;
 * const count = ones.pipe(reduce((acc, one) => acc + one, seed));
 *
 * count.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link count}
 * @see {@link expand}
 * @see {@link mergeScan}
 * @see {@link scan}
 *
 * @param {function(acc: A, value: V, index: number): A} accumulator The accumulator function
 * called on each source value.
 * @param {A} [seed] The initial accumulation value.
 * @return A function that returns an Observable that emits a single value that
 * is the result of accumulating the values emitted by the source Observable.
 */
export function reduce<V, A>(accumulator: (acc: V | A, value: V, index: number) => A, seed?: any): OperatorFunction<V, V | A> {
  return operate(scanInternals(accumulator, seed, arguments.length >= 2, false, true));
}
