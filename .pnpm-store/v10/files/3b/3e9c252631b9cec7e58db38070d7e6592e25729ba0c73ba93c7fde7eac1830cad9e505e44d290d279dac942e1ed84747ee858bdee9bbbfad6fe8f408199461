import { OperatorFunction, ObservableInput, ObservedValueOf, SchedulerLike } from '../types';
import { operate } from '../util/lift';
import { mergeInternals } from './mergeInternals';

/* tslint:disable:max-line-length */
export function expand<T, O extends ObservableInput<unknown>>(
  project: (value: T, index: number) => O,
  concurrent?: number,
  scheduler?: SchedulerLike
): OperatorFunction<T, ObservedValueOf<O>>;
/**
 * @deprecated The `scheduler` parameter will be removed in v8. If you need to schedule the inner subscription,
 * use `subscribeOn` within the projection function: `expand((value) => fn(value).pipe(subscribeOn(scheduler)))`.
 * Details: Details: https://rxjs.dev/deprecations/scheduler-argument
 */
export function expand<T, O extends ObservableInput<unknown>>(
  project: (value: T, index: number) => O,
  concurrent: number | undefined,
  scheduler: SchedulerLike
): OperatorFunction<T, ObservedValueOf<O>>;
/* tslint:enable:max-line-length */

/**
 * Recursively projects each source value to an Observable which is merged in
 * the output Observable.
 *
 * <span class="informal">It's similar to {@link mergeMap}, but applies the
 * projection function to every source value as well as every output value.
 * It's recursive.</span>
 *
 * ![](expand.png)
 *
 * Returns an Observable that emits items based on applying a function that you
 * supply to each item emitted by the source Observable, where that function
 * returns an Observable, and then merging those resulting Observables and
 * emitting the results of this merger. *Expand* will re-emit on the output
 * Observable every source value. Then, each output value is given to the
 * `project` function which returns an inner Observable to be merged on the
 * output Observable. Those output values resulting from the projection are also
 * given to the `project` function to produce new output values. This is how
 * *expand* behaves recursively.
 *
 * ## Example
 *
 * Start emitting the powers of two on every click, at most 10 of them
 *
 * ```ts
 * import { fromEvent, map, expand, of, delay, take } from 'rxjs';
 *
 * const clicks = fromEvent(document, 'click');
 * const powersOfTwo = clicks.pipe(
 *   map(() => 1),
 *   expand(x => of(2 * x).pipe(delay(1000))),
 *   take(10)
 * );
 * powersOfTwo.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link mergeMap}
 * @see {@link mergeScan}
 *
 * @param {function(value: T, index: number) => Observable} project A function
 * that, when applied to an item emitted by the source or the output Observable,
 * returns an Observable.
 * @param {number} [concurrent=Infinity] Maximum number of input
 * Observables being subscribed to concurrently.
 * @param {SchedulerLike} [scheduler=null] The {@link SchedulerLike} to use for subscribing to
 * each projected inner Observable.
 * @return A function that returns an Observable that emits the source values
 * and also result of applying the projection function to each value emitted on
 * the output Observable and merging the results of the Observables obtained
 * from this transformation.
 */
export function expand<T, O extends ObservableInput<unknown>>(
  project: (value: T, index: number) => O,
  concurrent = Infinity,
  scheduler?: SchedulerLike
): OperatorFunction<T, ObservedValueOf<O>> {
  concurrent = (concurrent || 0) < 1 ? Infinity : concurrent;
  return operate((source, subscriber) =>
    mergeInternals(
      // General merge params
      source,
      subscriber,
      project,
      concurrent,

      // onBeforeNext
      undefined,

      // Expand-specific
      true, // Use expand path
      scheduler // Inner subscription scheduler
    )
  );
}
