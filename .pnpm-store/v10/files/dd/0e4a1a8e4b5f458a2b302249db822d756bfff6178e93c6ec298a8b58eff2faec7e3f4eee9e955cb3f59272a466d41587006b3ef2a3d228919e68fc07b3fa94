import { Observable } from '../Observable';
import { SchedulerLike } from '../types';
/**
 * A simple Observable that emits no items to the Observer and immediately
 * emits a complete notification.
 *
 * <span class="informal">Just emits 'complete', and nothing else.</span>
 *
 * ![](empty.png)
 *
 * A simple Observable that only emits the complete notification. It can be used
 * for composing with other Observables, such as in a {@link mergeMap}.
 *
 * ## Examples
 *
 * Log complete notification
 *
 * ```ts
 * import { EMPTY } from 'rxjs';
 *
 * EMPTY.subscribe({
 *   next: () => console.log('Next'),
 *   complete: () => console.log('Complete!')
 * });
 *
 * // Outputs
 * // Complete!
 * ```
 *
 * Emit the number 7, then complete
 *
 * ```ts
 * import { EMPTY, startWith } from 'rxjs';
 *
 * const result = EMPTY.pipe(startWith(7));
 * result.subscribe(x => console.log(x));
 *
 * // Outputs
 * // 7
 * ```
 *
 * Map and flatten only odd numbers to the sequence `'a'`, `'b'`, `'c'`
 *
 * ```ts
 * import { interval, mergeMap, of, EMPTY } from 'rxjs';
 *
 * const interval$ = interval(1000);
 * const result = interval$.pipe(
 *   mergeMap(x => x % 2 === 1 ? of('a', 'b', 'c') : EMPTY),
 * );
 * result.subscribe(x => console.log(x));
 *
 * // Results in the following to the console:
 * // x is equal to the count on the interval, e.g. (0, 1, 2, 3, ...)
 * // x will occur every 1000ms
 * // if x % 2 is equal to 1, print a, b, c (each on its own)
 * // if x % 2 is not equal to 1, nothing will be output
 * ```
 *
 * @see {@link Observable}
 * @see {@link NEVER}
 * @see {@link of}
 * @see {@link throwError}
 */
export declare const EMPTY: Observable<never>;
/**
 * @param scheduler A {@link SchedulerLike} to use for scheduling
 * the emission of the complete notification.
 * @deprecated Replaced with the {@link EMPTY} constant or {@link scheduled} (e.g. `scheduled([], scheduler)`). Will be removed in v8.
 */
export declare function empty(scheduler?: SchedulerLike): Observable<never>;
//# sourceMappingURL=empty.d.ts.map