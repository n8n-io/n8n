import { MonoTypeOperatorFunction } from '../types';
import { identity } from '../util/identity';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';

export function distinctUntilChanged<T>(comparator?: (previous: T, current: T) => boolean): MonoTypeOperatorFunction<T>;
export function distinctUntilChanged<T, K>(
  comparator: (previous: K, current: K) => boolean,
  keySelector: (value: T) => K
): MonoTypeOperatorFunction<T>;

/**
 * Returns a result {@link Observable} that emits all values pushed by the source observable if they
 * are distinct in comparison to the last value the result observable emitted.
 *
 * When provided without parameters or with the first parameter (`{@link distinctUntilChanged#comparator comparator}`),
 * it behaves like this:
 *
 * 1. It will always emit the first value from the source.
 * 2. For all subsequent values pushed by the source, they will be compared to the previously emitted values
 *    using the provided `comparator` or an `===` equality check.
 * 3. If the value pushed by the source is determined to be unequal by this check, that value is emitted and
 *    becomes the new "previously emitted value" internally.
 *
 * When the second parameter (`{@link distinctUntilChanged#keySelector keySelector}`) is provided, the behavior
 * changes:
 *
 * 1. It will always emit the first value from the source.
 * 2. The `keySelector` will be run against all values, including the first value.
 * 3. For all values after the first, the selected key will be compared against the key selected from
 *    the previously emitted value using the `comparator`.
 * 4. If the keys are determined to be unequal by this check, the value (not the key), is emitted
 *    and the selected key from that value is saved for future comparisons against other keys.
 *
 * ## Examples
 *
 * A very basic example with no `{@link distinctUntilChanged#comparator comparator}`. Note that `1` is emitted more than once,
 * because it's distinct in comparison to the _previously emitted_ value,
 * not in comparison to _all other emitted values_.
 *
 * ```ts
 * import { of, distinctUntilChanged } from 'rxjs';
 *
 * of(1, 1, 1, 2, 2, 2, 1, 1, 3, 3)
 *   .pipe(distinctUntilChanged())
 *   .subscribe(console.log);
 * // Logs: 1, 2, 1, 3
 * ```
 *
 * With a `{@link distinctUntilChanged#comparator comparator}`, you can do custom comparisons. Let's say
 * you only want to emit a value when all of its components have
 * changed:
 *
 * ```ts
 * import { of, distinctUntilChanged } from 'rxjs';
 *
 * const totallyDifferentBuilds$ = of(
 *   { engineVersion: '1.1.0', transmissionVersion: '1.2.0' },
 *   { engineVersion: '1.1.0', transmissionVersion: '1.4.0' },
 *   { engineVersion: '1.3.0', transmissionVersion: '1.4.0' },
 *   { engineVersion: '1.3.0', transmissionVersion: '1.5.0' },
 *   { engineVersion: '2.0.0', transmissionVersion: '1.5.0' }
 * ).pipe(
 *   distinctUntilChanged((prev, curr) => {
 *     return (
 *       prev.engineVersion === curr.engineVersion ||
 *       prev.transmissionVersion === curr.transmissionVersion
 *     );
 *   })
 * );
 *
 * totallyDifferentBuilds$.subscribe(console.log);
 *
 * // Logs:
 * // { engineVersion: '1.1.0', transmissionVersion: '1.2.0' }
 * // { engineVersion: '1.3.0', transmissionVersion: '1.4.0' }
 * // { engineVersion: '2.0.0', transmissionVersion: '1.5.0' }
 * ```
 *
 * You can also provide a custom `{@link distinctUntilChanged#comparator comparator}` to check that emitted
 * changes are only in one direction. Let's say you only want to get
 * the next record temperature:
 *
 * ```ts
 * import { of, distinctUntilChanged } from 'rxjs';
 *
 * const temps$ = of(30, 31, 20, 34, 33, 29, 35, 20);
 *
 * const recordHighs$ = temps$.pipe(
 *   distinctUntilChanged((prevHigh, temp) => {
 *     // If the current temp is less than
 *     // or the same as the previous record,
 *     // the record hasn't changed.
 *     return temp <= prevHigh;
 *   })
 * );
 *
 * recordHighs$.subscribe(console.log);
 * // Logs: 30, 31, 34, 35
 * ```
 *
 * Selecting update events only when the `updatedBy` field shows
 * the account changed hands.
 *
 * ```ts
 * import { of, distinctUntilChanged } from 'rxjs';
 *
 * // A stream of updates to a given account
 * const accountUpdates$ = of(
 *   { updatedBy: 'blesh', data: [] },
 *   { updatedBy: 'blesh', data: [] },
 *   { updatedBy: 'ncjamieson', data: [] },
 *   { updatedBy: 'ncjamieson', data: [] },
 *   { updatedBy: 'blesh', data: [] }
 * );
 *
 * // We only want the events where it changed hands
 * const changedHands$ = accountUpdates$.pipe(
 *   distinctUntilChanged(undefined, update => update.updatedBy)
 * );
 *
 * changedHands$.subscribe(console.log);
 * // Logs:
 * // { updatedBy: 'blesh', data: Array[0] }
 * // { updatedBy: 'ncjamieson', data: Array[0] }
 * // { updatedBy: 'blesh', data: Array[0] }
 * ```
 *
 * @see {@link distinct}
 * @see {@link distinctUntilKeyChanged}
 *
 * @param comparator A function used to compare the previous and current keys for
 * equality. Defaults to a `===` check.
 * @param keySelector Used to select a key value to be passed to the `comparator`.
 *
 * @return A function that returns an Observable that emits items from the
 * source Observable with distinct values.
 */
export function distinctUntilChanged<T, K>(
  comparator?: (previous: K, current: K) => boolean,
  keySelector: (value: T) => K = identity as (value: T) => K
): MonoTypeOperatorFunction<T> {
  // We've been allowing `null` do be passed as the `compare`, so we can't do
  // a default value for the parameter, because that will only work
  // for `undefined`.
  comparator = comparator ?? defaultCompare;

  return operate((source, subscriber) => {
    // The previous key, used to compare against keys selected
    // from new arrivals to determine "distinctiveness".
    let previousKey: K;
    // Whether or not this is the first value we've gotten.
    let first = true;

    source.subscribe(
      createOperatorSubscriber(subscriber, (value) => {
        // We always call the key selector.
        const currentKey = keySelector(value);

        // If it's the first value, we always emit it.
        // Otherwise, we compare this key to the previous key, and
        // if the comparer returns false, we emit.
        if (first || !comparator!(previousKey, currentKey)) {
          // Update our state *before* we emit the value
          // as emission can be the source of re-entrant code
          // in functional libraries like this. We only really
          // need to do this if it's the first value, or if the
          // key we're tracking in previous needs to change.
          first = false;
          previousKey = currentKey;

          // Emit the value!
          subscriber.next(value);
        }
      })
    );
  });
}

function defaultCompare(a: any, b: any) {
  return a === b;
}
