import { OperatorFunction, ObservableInputTuple } from '../types';
import { raceInit } from '../observable/race';
import { operate } from '../util/lift';
import { identity } from '../util/identity';

/**
 * Creates an Observable that mirrors the first source Observable to emit a next,
 * error or complete notification from the combination of the Observable to which
 * the operator is applied and supplied Observables.
 *
 * ## Example
 *
 * ```ts
 * import { interval, map, raceWith } from 'rxjs';
 *
 * const obs1 = interval(7000).pipe(map(() => 'slow one'));
 * const obs2 = interval(3000).pipe(map(() => 'fast one'));
 * const obs3 = interval(5000).pipe(map(() => 'medium one'));
 *
 * obs1
 *   .pipe(raceWith(obs2, obs3))
 *   .subscribe(winner => console.log(winner));
 *
 * // Outputs
 * // a series of 'fast one'
 * ```
 *
 * @param otherSources Sources used to race for which Observable emits first.
 * @return A function that returns an Observable that mirrors the output of the
 * first Observable to emit an item.
 */
export function raceWith<T, A extends readonly unknown[]>(
  ...otherSources: [...ObservableInputTuple<A>]
): OperatorFunction<T, T | A[number]> {
  return !otherSources.length
    ? identity
    : operate((source, subscriber) => {
        raceInit<T | A[number]>([source, ...otherSources])(subscriber);
      });
}
