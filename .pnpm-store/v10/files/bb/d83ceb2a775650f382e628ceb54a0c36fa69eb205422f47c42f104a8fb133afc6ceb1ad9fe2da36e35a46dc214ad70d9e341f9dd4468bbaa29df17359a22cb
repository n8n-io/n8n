import { OperatorFunction, ObservableInput, ObservedValueOf } from '../types';
import { exhaustMap } from './exhaustMap';
import { identity } from '../util/identity';

/**
 * Converts a higher-order Observable into a first-order Observable by dropping
 * inner Observables while the previous inner Observable has not yet completed.
 *
 * <span class="informal">Flattens an Observable-of-Observables by dropping the
 * next inner Observables while the current inner is still executing.</span>
 *
 * ![](exhaustAll.svg)
 *
 * `exhaustAll` subscribes to an Observable that emits Observables, also known as a
 * higher-order Observable. Each time it observes one of these emitted inner
 * Observables, the output Observable begins emitting the items emitted by that
 * inner Observable. So far, it behaves like {@link mergeAll}. However,
 * `exhaustAll` ignores every new inner Observable if the previous Observable has
 * not yet completed. Once that one completes, it will accept and flatten the
 * next inner Observable and repeat this process.
 *
 * ## Example
 *
 * Run a finite timer for each click, only if there is no currently active timer
 *
 * ```ts
 * import { fromEvent, map, interval, take, exhaustAll } from 'rxjs';
 *
 * const clicks = fromEvent(document, 'click');
 * const higherOrder = clicks.pipe(
 *   map(() => interval(1000).pipe(take(5)))
 * );
 * const result = higherOrder.pipe(exhaustAll());
 * result.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link combineLatestAll}
 * @see {@link concatAll}
 * @see {@link switchAll}
 * @see {@link switchMap}
 * @see {@link mergeAll}
 * @see {@link exhaustMap}
 * @see {@link zipAll}
 *
 * @return A function that returns an Observable that takes a source of
 * Observables and propagates the first Observable exclusively until it
 * completes before subscribing to the next.
 */
export function exhaustAll<O extends ObservableInput<any>>(): OperatorFunction<O, ObservedValueOf<O>> {
  return exhaustMap(identity);
}
