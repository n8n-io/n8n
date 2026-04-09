import { ObservableInput, OperatorFunction } from '../types';
/**
 * Applies an accumulator function over the source Observable where the
 * accumulator function itself returns an Observable, then each intermediate
 * Observable returned is merged into the output Observable.
 *
 * <span class="informal">It's like {@link scan}, but the Observables returned
 * by the accumulator are merged into the outer Observable.</span>
 *
 * The first parameter of the `mergeScan` is an `accumulator` function which is
 * being called every time the source Observable emits a value. `mergeScan` will
 * subscribe to the value returned by the `accumulator` function and will emit
 * values to the subscriber emitted by inner Observable.
 *
 * The `accumulator` function is being called with three parameters passed to it:
 * `acc`, `value` and `index`. The `acc` parameter is used as the state parameter
 * whose value is initially set to the `seed` parameter (the second parameter
 * passed to the `mergeScan` operator).
 *
 * `mergeScan` internally keeps the value of the `acc` parameter: as long as the
 * source Observable emits without inner Observable emitting, the `acc` will be
 * set to `seed`. The next time the inner Observable emits a value, `mergeScan`
 * will internally remember it and it will be passed to the `accumulator`
 * function as `acc` parameter the next time source emits.
 *
 * The `value` parameter of the `accumulator` function is the value emitted by the
 * source Observable, while the `index` is a number which represent the order of the
 * current emission by the source Observable. It starts with 0.
 *
 * The last parameter to the `mergeScan` is the `concurrent` value which defaults
 * to Infinity. It represents the maximum number of inner Observable subscriptions
 * at a time.
 *
 * ## Example
 *
 * Count the number of click events
 *
 * ```ts
 * import { fromEvent, map, mergeScan, of } from 'rxjs';
 *
 * const click$ = fromEvent(document, 'click');
 * const one$ = click$.pipe(map(() => 1));
 * const seed = 0;
 * const count$ = one$.pipe(
 *   mergeScan((acc, one) => of(acc + one), seed)
 * );
 *
 * count$.subscribe(x => console.log(x));
 *
 * // Results:
 * // 1
 * // 2
 * // 3
 * // 4
 * // ...and so on for each click
 * ```
 *
 * @see {@link scan}
 * @see {@link switchScan}
 *
 * @param accumulator The accumulator function called on each source value.
 * @param seed The initial accumulation value.
 * @param concurrent Maximum number of input Observables being subscribed to
 * concurrently.
 * @return A function that returns an Observable of the accumulated values.
 */
export declare function mergeScan<T, R>(accumulator: (acc: R, value: T, index: number) => ObservableInput<R>, seed: R, concurrent?: number): OperatorFunction<T, R>;
//# sourceMappingURL=mergeScan.d.ts.map