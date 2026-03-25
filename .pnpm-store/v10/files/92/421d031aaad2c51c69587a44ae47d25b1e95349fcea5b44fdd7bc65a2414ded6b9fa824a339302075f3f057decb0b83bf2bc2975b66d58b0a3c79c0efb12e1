import { mergeAll } from './mergeAll';
import { OperatorFunction, ObservableInput, ObservedValueOf } from '../types';

/**
 * Converts a higher-order Observable into a first-order Observable by
 * concatenating the inner Observables in order.
 *
 * <span class="informal">Flattens an Observable-of-Observables by putting one
 * inner Observable after the other.</span>
 *
 * ![](concatAll.svg)
 *
 * Joins every Observable emitted by the source (a higher-order Observable), in
 * a serial fashion. It subscribes to each inner Observable only after the
 * previous inner Observable has completed, and merges all of their values into
 * the returned observable.
 *
 * __Warning:__ If the source Observable emits Observables quickly and
 * endlessly, and the inner Observables it emits generally complete slower than
 * the source emits, you can run into memory issues as the incoming Observables
 * collect in an unbounded buffer.
 *
 * Note: `concatAll` is equivalent to `mergeAll` with concurrency parameter set
 * to `1`.
 *
 * ## Example
 *
 * For each click event, tick every second from 0 to 3, with no concurrency
 *
 * ```ts
 * import { fromEvent, map, interval, take, concatAll } from 'rxjs';
 *
 * const clicks = fromEvent(document, 'click');
 * const higherOrder = clicks.pipe(
 *   map(() => interval(1000).pipe(take(4)))
 * );
 * const firstOrder = higherOrder.pipe(concatAll());
 * firstOrder.subscribe(x => console.log(x));
 *
 * // Results in the following:
 * // (results are not concurrent)
 * // For every click on the "document" it will emit values 0 to 3 spaced
 * // on a 1000ms interval
 * // one click = 1000ms-> 0 -1000ms-> 1 -1000ms-> 2 -1000ms-> 3
 * ```
 *
 * @see {@link combineLatestAll}
 * @see {@link concat}
 * @see {@link concatMap}
 * @see {@link concatMapTo}
 * @see {@link exhaustAll}
 * @see {@link mergeAll}
 * @see {@link switchAll}
 * @see {@link switchMap}
 * @see {@link zipAll}
 *
 * @return A function that returns an Observable emitting values from all the
 * inner Observables concatenated.
 */
export function concatAll<O extends ObservableInput<any>>(): OperatorFunction<O, ObservedValueOf<O>> {
  return mergeAll(1);
}
