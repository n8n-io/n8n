import { MonoTypeOperatorFunction, ObservableInput } from '../types';
/**
 * Returns an Observable that emits all items emitted by the source Observable that are distinct by comparison from previous items.
 *
 * If a `keySelector` function is provided, then it will project each value from the source observable into a new value that it will
 * check for equality with previously projected values. If the `keySelector` function is not provided, it will use each value from the
 * source observable directly with an equality check against previous values.
 *
 * In JavaScript runtimes that support `Set`, this operator will use a `Set` to improve performance of the distinct value checking.
 *
 * In other runtimes, this operator will use a minimal implementation of `Set` that relies on an `Array` and `indexOf` under the
 * hood, so performance will degrade as more values are checked for distinction. Even in newer browsers, a long-running `distinct`
 * use might result in memory leaks. To help alleviate this in some scenarios, an optional `flushes` parameter is also provided so
 * that the internal `Set` can be "flushed", basically clearing it of values.
 *
 * ## Examples
 *
 * A simple example with numbers
 *
 * ```ts
 * import { of, distinct } from 'rxjs';
 *
 * of(1, 1, 2, 2, 2, 1, 2, 3, 4, 3, 2, 1)
 *   .pipe(distinct())
 *   .subscribe(x => console.log(x));
 *
 * // Outputs
 * // 1
 * // 2
 * // 3
 * // 4
 * ```
 *
 * An example using the `keySelector` function
 *
 * ```ts
 * import { of, distinct } from 'rxjs';
 *
 * of(
 *   { age: 4, name: 'Foo'},
 *   { age: 7, name: 'Bar'},
 *   { age: 5, name: 'Foo'}
 * )
 * .pipe(distinct(({ name }) => name))
 * .subscribe(x => console.log(x));
 *
 * // Outputs
 * // { age: 4, name: 'Foo' }
 * // { age: 7, name: 'Bar' }
 * ```
 * @see {@link distinctUntilChanged}
 * @see {@link distinctUntilKeyChanged}
 *
 * @param keySelector Optional `function` to select which value you want to check as distinct.
 * @param flushes Optional `ObservableInput` for flushing the internal HashSet of the operator.
 * @return A function that returns an Observable that emits items from the
 * source Observable with distinct values.
 */
export declare function distinct<T, K>(keySelector?: (value: T) => K, flushes?: ObservableInput<any>): MonoTypeOperatorFunction<T>;
//# sourceMappingURL=distinct.d.ts.map