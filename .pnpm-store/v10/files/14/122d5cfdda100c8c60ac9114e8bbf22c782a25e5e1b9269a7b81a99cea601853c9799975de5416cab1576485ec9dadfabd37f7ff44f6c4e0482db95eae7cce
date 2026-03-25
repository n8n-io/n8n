import { combineLatest } from '../observable/combineLatest';
import { OperatorFunction, ObservableInput } from '../types';
import { joinAllInternals } from './joinAllInternals';

export function combineLatestAll<T>(): OperatorFunction<ObservableInput<T>, T[]>;
export function combineLatestAll<T>(): OperatorFunction<any, T[]>;
export function combineLatestAll<T, R>(project: (...values: T[]) => R): OperatorFunction<ObservableInput<T>, R>;
export function combineLatestAll<R>(project: (...values: Array<any>) => R): OperatorFunction<any, R>;

/**
 * Flattens an Observable-of-Observables by applying {@link combineLatest} when the Observable-of-Observables completes.
 *
 * `combineLatestAll` takes an Observable of Observables, and collects all Observables from it. Once the outer Observable completes,
 * it subscribes to all collected Observables and combines their values using the {@link combineLatest} strategy, such that:
 *
 * * Every time an inner Observable emits, the output Observable emits
 * * When the returned observable emits, it emits all of the latest values by:
 *    * If a `project` function is provided, it is called with each recent value from each inner Observable in whatever order they
 *      arrived, and the result of the `project` function is what is emitted by the output Observable.
 *    * If there is no `project` function, an array of all the most recent values is emitted by the output Observable.
 *
 * ## Example
 *
 * Map two click events to a finite interval Observable, then apply `combineLatestAll`
 *
 * ```ts
 * import { fromEvent, map, interval, take, combineLatestAll } from 'rxjs';
 *
 * const clicks = fromEvent(document, 'click');
 * const higherOrder = clicks.pipe(
 *   map(() => interval(Math.random() * 2000).pipe(take(3))),
 *   take(2)
 * );
 * const result = higherOrder.pipe(combineLatestAll());
 *
 * result.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link combineLatest}
 * @see {@link combineLatestWith}
 * @see {@link mergeAll}
 *
 * @param project optional function to map the most recent values from each inner Observable into a new result.
 * Takes each of the most recent values from each collected inner Observable as arguments, in order.
 * @return A function that returns an Observable that flattens Observables
 * emitted by the source Observable.
 */
export function combineLatestAll<R>(project?: (...values: Array<any>) => R) {
  return joinAllInternals(combineLatest, project);
}
