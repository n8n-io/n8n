import { Observable } from '../Observable';
import { ObservableInputTuple, SchedulerLike } from '../types';
import { concatAll } from '../operators/concatAll';
import { popScheduler } from '../util/args';
import { from } from './from';

export function concat<T extends readonly unknown[]>(...inputs: [...ObservableInputTuple<T>]): Observable<T[number]>;
export function concat<T extends readonly unknown[]>(
  ...inputsAndScheduler: [...ObservableInputTuple<T>, SchedulerLike]
): Observable<T[number]>;

/**
 * Creates an output Observable which sequentially emits all values from the first given
 * Observable and then moves on to the next.
 *
 * <span class="informal">Concatenates multiple Observables together by
 * sequentially emitting their values, one Observable after the other.</span>
 *
 * ![](concat.png)
 *
 * `concat` joins multiple Observables together, by subscribing to them one at a time and
 * merging their results into the output Observable. You can pass either an array of
 * Observables, or put them directly as arguments. Passing an empty array will result
 * in Observable that completes immediately.
 *
 * `concat` will subscribe to first input Observable and emit all its values, without
 * changing or affecting them in any way. When that Observable completes, it will
 * subscribe to then next Observable passed and, again, emit its values. This will be
 * repeated, until the operator runs out of Observables. When last input Observable completes,
 * `concat` will complete as well. At any given moment only one Observable passed to operator
 * emits values. If you would like to emit values from passed Observables concurrently, check out
 * {@link merge} instead, especially with optional `concurrent` parameter. As a matter of fact,
 * `concat` is an equivalent of `merge` operator with `concurrent` parameter set to `1`.
 *
 * Note that if some input Observable never completes, `concat` will also never complete
 * and Observables following the one that did not complete will never be subscribed. On the other
 * hand, if some Observable simply completes immediately after it is subscribed, it will be
 * invisible for `concat`, which will just move on to the next Observable.
 *
 * If any Observable in chain errors, instead of passing control to the next Observable,
 * `concat` will error immediately as well. Observables that would be subscribed after
 * the one that emitted error, never will.
 *
 * If you pass to `concat` the same Observable many times, its stream of values
 * will be "replayed" on every subscription, which means you can repeat given Observable
 * as many times as you like. If passing the same Observable to `concat` 1000 times becomes tedious,
 * you can always use {@link repeat}.
 *
 * ## Examples
 *
 * Concatenate a timer counting from 0 to 3 with a synchronous sequence from 1 to 10
 *
 * ```ts
 * import { interval, take, range, concat } from 'rxjs';
 *
 * const timer = interval(1000).pipe(take(4));
 * const sequence = range(1, 10);
 * const result = concat(timer, sequence);
 * result.subscribe(x => console.log(x));
 *
 * // results in:
 * // 0 -1000ms-> 1 -1000ms-> 2 -1000ms-> 3 -immediate-> 1 ... 10
 * ```
 *
 * Concatenate 3 Observables
 *
 * ```ts
 * import { interval, take, concat } from 'rxjs';
 *
 * const timer1 = interval(1000).pipe(take(10));
 * const timer2 = interval(2000).pipe(take(6));
 * const timer3 = interval(500).pipe(take(10));
 *
 * const result = concat(timer1, timer2, timer3);
 * result.subscribe(x => console.log(x));
 *
 * // results in the following:
 * // (Prints to console sequentially)
 * // -1000ms-> 0 -1000ms-> 1 -1000ms-> ... 9
 * // -2000ms-> 0 -2000ms-> 1 -2000ms-> ... 5
 * // -500ms-> 0 -500ms-> 1 -500ms-> ... 9
 * ```
 *
 * Concatenate the same Observable to repeat it
 *
 * ```ts
 * import { interval, take, concat } from 'rxjs';
 *
 * const timer = interval(1000).pipe(take(2));
 *
 * concat(timer, timer) // concatenating the same Observable!
 *   .subscribe({
 *     next: value => console.log(value),
 *     complete: () => console.log('...and it is done!')
 *   });
 *
 * // Logs:
 * // 0 after 1s
 * // 1 after 2s
 * // 0 after 3s
 * // 1 after 4s
 * // '...and it is done!' also after 4s
 * ```
 *
 * @see {@link concatAll}
 * @see {@link concatMap}
 * @see {@link concatMapTo}
 * @see {@link startWith}
 * @see {@link endWith}
 *
 * @param args `ObservableInput`s to concatenate.
 */
export function concat(...args: any[]): Observable<unknown> {
  return concatAll()(from(args, popScheduler(args)));
}
