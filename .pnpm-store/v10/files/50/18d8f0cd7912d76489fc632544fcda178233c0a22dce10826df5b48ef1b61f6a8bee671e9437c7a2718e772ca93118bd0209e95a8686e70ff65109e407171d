import { concat } from '../observable/concat';
import { OperatorFunction, SchedulerLike, ValueFromArray } from '../types';
import { popScheduler } from '../util/args';
import { operate } from '../util/lift';

// Devs are more likely to pass null or undefined than they are a scheduler
// without accompanying values. To make things easier for (naughty) devs who
// use the `strictNullChecks: false` TypeScript compiler option, these
// overloads with explicit null and undefined values are included.

export function startWith<T>(value: null): OperatorFunction<T, T | null>;
export function startWith<T>(value: undefined): OperatorFunction<T, T | undefined>;

/** @deprecated The `scheduler` parameter will be removed in v8. Use `scheduled` and `concatAll`. Details: https://rxjs.dev/deprecations/scheduler-argument */
export function startWith<T, A extends readonly unknown[] = T[]>(
  ...valuesAndScheduler: [...A, SchedulerLike]
): OperatorFunction<T, T | ValueFromArray<A>>;
export function startWith<T, A extends readonly unknown[] = T[]>(...values: A): OperatorFunction<T, T | ValueFromArray<A>>;

/**
 * Returns an observable that, at the moment of subscription, will synchronously emit all
 * values provided to this operator, then subscribe to the source and mirror all of its emissions
 * to subscribers.
 *
 * This is a useful way to know when subscription has occurred on an existing observable.
 *
 * <span class="informal">First emits its arguments in order, and then any
 * emissions from the source.</span>
 *
 * ![](startWith.png)
 *
 * ## Examples
 *
 * Emit a value when a timer starts.
 *
 * ```ts
 * import { timer, map, startWith } from 'rxjs';
 *
 * timer(1000)
 *   .pipe(
 *     map(() => 'timer emit'),
 *     startWith('timer start')
 *   )
 *   .subscribe(x => console.log(x));
 *
 * // results:
 * // 'timer start'
 * // 'timer emit'
 * ```
 *
 * @param values Items you want the modified Observable to emit first.
 * @return A function that returns an Observable that synchronously emits
 * provided values before subscribing to the source Observable.
 *
 * @see {@link endWith}
 * @see {@link finalize}
 * @see {@link concat}
 */
export function startWith<T, D>(...values: D[]): OperatorFunction<T, T | D> {
  const scheduler = popScheduler(values);
  return operate((source, subscriber) => {
    // Here we can't pass `undefined` as a scheduler, because if we did, the
    // code inside of `concat` would be confused by the `undefined`, and treat it
    // like an invalid observable. So we have to split it two different ways.
    (scheduler ? concat(values, source, scheduler) : concat(values, source)).subscribe(subscriber);
  });
}
