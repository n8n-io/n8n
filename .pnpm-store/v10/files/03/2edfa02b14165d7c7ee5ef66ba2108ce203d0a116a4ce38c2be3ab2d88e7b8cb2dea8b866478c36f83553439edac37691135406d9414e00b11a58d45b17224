import { Observable } from '../Observable';
import { EmptyError } from '../util/EmptyError';

import { MonoTypeOperatorFunction, OperatorFunction, TruthyTypesOf } from '../types';
import { SequenceError } from '../util/SequenceError';
import { NotFoundError } from '../util/NotFoundError';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';

export function single<T>(predicate: BooleanConstructor): OperatorFunction<T, TruthyTypesOf<T>>;
export function single<T>(predicate?: (value: T, index: number, source: Observable<T>) => boolean): MonoTypeOperatorFunction<T>;

/**
 * Returns an observable that asserts that only one value is
 * emitted from the observable that matches the predicate. If no
 * predicate is provided, then it will assert that the observable
 * only emits one value.
 *
 * If the source Observable did not emit `next` before completion, it
 * will emit an {@link EmptyError} to the Observer's `error` callback.
 *
 * In the event that two values are found that match the predicate,
 * or when there are two values emitted and no predicate, it will
 * emit a {@link SequenceError} to the Observer's `error` callback.
 *
 * In the event that no values match the predicate, if one is provided,
 * it will emit a {@link NotFoundError} to the Observer's `error` callback.
 *
 * ## Example
 *
 * Expect only `name` beginning with `'B'`
 *
 * ```ts
 * import { of, single } from 'rxjs';
 *
 * const source1 = of(
 *  { name: 'Ben' },
 *  { name: 'Tracy' },
 *  { name: 'Laney' },
 *  { name: 'Lily' }
 * );
 *
 * source1
 *   .pipe(single(x => x.name.startsWith('B')))
 *   .subscribe(x => console.log(x));
 * // Emits 'Ben'
 *
 *
 * const source2 = of(
 *  { name: 'Ben' },
 *  { name: 'Tracy' },
 *  { name: 'Bradley' },
 *  { name: 'Lincoln' }
 * );
 *
 * source2
 *   .pipe(single(x => x.name.startsWith('B')))
 *   .subscribe({ error: err => console.error(err) });
 * // Error emitted: SequenceError('Too many values match')
 *
 *
 * const source3 = of(
 *  { name: 'Laney' },
 *  { name: 'Tracy' },
 *  { name: 'Lily' },
 *  { name: 'Lincoln' }
 * );
 *
 * source3
 *   .pipe(single(x => x.name.startsWith('B')))
 *   .subscribe({ error: err => console.error(err) });
 * // Error emitted: NotFoundError('No values match')
 * ```
 *
 * @see {@link first}
 * @see {@link find}
 * @see {@link findIndex}
 * @see {@link elementAt}
 *
 * @throws {NotFoundError} Delivers a `NotFoundError` to the Observer's `error`
 * callback if the Observable completes before any `next` notification was sent.
 * @throws {SequenceError} Delivers a `SequenceError` if more than one value is
 * emitted that matches the provided predicate. If no predicate is provided, it
 * will deliver a `SequenceError` if more than one value comes from the source.
 * @throws {EmptyError} Delivers an `EmptyError` if no values were `next`ed prior
 * to completion.
 *
 * @param predicate A predicate function to evaluate items emitted by the source
 * Observable.
 * @return A function that returns an Observable that emits the single item
 * emitted by the source Observable that matches the predicate.
 */
export function single<T>(predicate?: (value: T, index: number, source: Observable<T>) => boolean): MonoTypeOperatorFunction<T> {
  return operate((source, subscriber) => {
    let hasValue = false;
    let singleValue: T;
    let seenValue = false;
    let index = 0;
    source.subscribe(
      createOperatorSubscriber(
        subscriber,
        (value) => {
          seenValue = true;
          if (!predicate || predicate(value, index++, source)) {
            hasValue && subscriber.error(new SequenceError('Too many matching values'));
            hasValue = true;
            singleValue = value;
          }
        },
        () => {
          if (hasValue) {
            subscriber.next(singleValue);
            subscriber.complete();
          } else {
            subscriber.error(seenValue ? new NotFoundError('No matching values') : new EmptyError());
          }
        }
      )
    );
  });
}
