import { MonoTypeOperatorFunction } from '../types';
/**
 * The Min operator operates on an Observable that emits numbers (or items that can be compared with a provided function),
 * and when source Observable completes it emits a single item: the item with the smallest value.
 *
 * ![](min.png)
 *
 * ## Examples
 *
 * Get the minimal value of a series of numbers
 *
 * ```ts
 * import { of, min } from 'rxjs';
 *
 * of(5, 4, 7, 2, 8)
 *   .pipe(min())
 *   .subscribe(x => console.log(x));
 *
 * // Outputs
 * // 2
 * ```
 *
 * Use a comparer function to get the minimal item
 *
 * ```ts
 * import { of, min } from 'rxjs';
 *
 * of(
 *   { age: 7, name: 'Foo' },
 *   { age: 5, name: 'Bar' },
 *   { age: 9, name: 'Beer' }
 * ).pipe(
 *   min((a, b) => a.age < b.age ? -1 : 1)
 * )
 * .subscribe(x => console.log(x.name));
 *
 * // Outputs
 * // 'Bar'
 * ```
 *
 * @see {@link max}
 *
 * @param {Function} [comparer] - Optional comparer function that it will use instead of its default to compare the
 * value of two items.
 * @return A function that returns an Observable that emits item with the
 * smallest value.
 */
export declare function min<T>(comparer?: (x: T, y: T) => number): MonoTypeOperatorFunction<T>;
//# sourceMappingURL=min.d.ts.map