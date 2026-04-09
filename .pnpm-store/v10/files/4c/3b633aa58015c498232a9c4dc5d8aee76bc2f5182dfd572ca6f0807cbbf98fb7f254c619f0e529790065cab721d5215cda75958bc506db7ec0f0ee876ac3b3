import { reduce } from './reduce';
import { MonoTypeOperatorFunction } from '../types';
import { isFunction } from '../util/isFunction';

/**
 * The `max` operator operates on an Observable that emits numbers (or items that
 * can be compared with a provided function), and when source Observable completes
 * it emits a single item: the item with the largest value.
 *
 * ![](max.png)
 *
 * ## Examples
 *
 * Get the maximal value of a series of numbers
 *
 * ```ts
 * import { of, max } from 'rxjs';
 *
 * of(5, 4, 7, 2, 8)
 *   .pipe(max())
 *   .subscribe(x => console.log(x));
 *
 * // Outputs
 * // 8
 * ```
 *
 * Use a comparer function to get the maximal item
 *
 * ```ts
 * import { of, max } from 'rxjs';
 *
 * of(
 *   { age: 7, name: 'Foo' },
 *   { age: 5, name: 'Bar' },
 *   { age: 9, name: 'Beer' }
 * ).pipe(
 *   max((a, b) => a.age < b.age ? -1 : 1)
 * )
 * .subscribe(x => console.log(x.name));
 *
 * // Outputs
 * // 'Beer'
 * ```
 *
 * @see {@link min}
 *
 * @param comparer Optional comparer function that it will use instead of its
 * default to compare the value of two items.
 * @return A function that returns an Observable that emits item with the
 * largest value.
 */
export function max<T>(comparer?: (x: T, y: T) => number): MonoTypeOperatorFunction<T> {
  return reduce(isFunction(comparer) ? (x, y) => (comparer(x, y) > 0 ? x : y) : (x, y) => (x > y ? x : y));
}
