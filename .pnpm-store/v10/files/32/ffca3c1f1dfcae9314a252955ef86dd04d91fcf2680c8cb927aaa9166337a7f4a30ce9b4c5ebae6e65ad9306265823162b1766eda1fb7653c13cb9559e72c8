import { OperatorFunction } from '../types';
/**
 * Counts the number of emissions on the source and emits that number when the
 * source completes.
 *
 * <span class="informal">Tells how many values were emitted, when the source
 * completes.</span>
 *
 * ![](count.png)
 *
 * `count` transforms an Observable that emits values into an Observable that
 * emits a single value that represents the number of values emitted by the
 * source Observable. If the source Observable terminates with an error, `count`
 * will pass this error notification along without emitting a value first. If
 * the source Observable does not terminate at all, `count` will neither emit
 * a value nor terminate. This operator takes an optional `predicate` function
 * as argument, in which case the output emission will represent the number of
 * source values that matched `true` with the `predicate`.
 *
 * ## Examples
 *
 * Counts how many seconds have passed before the first click happened
 *
 * ```ts
 * import { interval, fromEvent, takeUntil, count } from 'rxjs';
 *
 * const seconds = interval(1000);
 * const clicks = fromEvent(document, 'click');
 * const secondsBeforeClick = seconds.pipe(takeUntil(clicks));
 * const result = secondsBeforeClick.pipe(count());
 * result.subscribe(x => console.log(x));
 * ```
 *
 * Counts how many odd numbers are there between 1 and 7
 *
 * ```ts
 * import { range, count } from 'rxjs';
 *
 * const numbers = range(1, 7);
 * const result = numbers.pipe(count(i => i % 2 === 1));
 * result.subscribe(x => console.log(x));
 * // Results in:
 * // 4
 * ```
 *
 * @see {@link max}
 * @see {@link min}
 * @see {@link reduce}
 *
 * @param predicate A function that is used to analyze the value and the index and
 * determine whether or not to increment the count. Return `true` to increment the count,
 * and return `false` to keep the count the same.
 * If the predicate is not provided, every value will be counted.
 * @return A function that returns an Observable that emits one number that
 * represents the count of emissions.
 */
export declare function count<T>(predicate?: (value: T, index: number) => boolean): OperatorFunction<T, number>;
//# sourceMappingURL=count.d.ts.map