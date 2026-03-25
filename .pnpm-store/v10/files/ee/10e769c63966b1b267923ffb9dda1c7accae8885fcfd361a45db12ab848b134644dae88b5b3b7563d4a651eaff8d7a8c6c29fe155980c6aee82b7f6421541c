import { OperatorFunction } from '../types';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';

/**
 * Emits a given value if the source Observable completes without emitting any
 * `next` value, otherwise mirrors the source Observable.
 *
 * <span class="informal">If the source Observable turns out to be empty, then
 * this operator will emit a default value.</span>
 *
 * ![](defaultIfEmpty.png)
 *
 * `defaultIfEmpty` emits the values emitted by the source Observable or a
 * specified default value if the source Observable is empty (completes without
 * having emitted any `next` value).
 *
 * ## Example
 *
 * If no clicks happen in 5 seconds, then emit 'no clicks'
 *
 * ```ts
 * import { fromEvent, takeUntil, interval, defaultIfEmpty } from 'rxjs';
 *
 * const clicks = fromEvent(document, 'click');
 * const clicksBeforeFive = clicks.pipe(takeUntil(interval(5000)));
 * const result = clicksBeforeFive.pipe(defaultIfEmpty('no clicks'));
 * result.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link empty}
 * @see {@link last}
 *
 * @param defaultValue The default value used if the source
 * Observable is empty.
 * @return A function that returns an Observable that emits either the
 * specified `defaultValue` if the source Observable emits no items, or the
 * values emitted by the source Observable.
 */
export function defaultIfEmpty<T, R>(defaultValue: R): OperatorFunction<T, T | R> {
  return operate((source, subscriber) => {
    let hasValue = false;
    source.subscribe(
      createOperatorSubscriber(
        subscriber,
        (value) => {
          hasValue = true;
          subscriber.next(value);
        },
        () => {
          if (!hasValue) {
            subscriber.next(defaultValue!);
          }
          subscriber.complete();
        }
      )
    );
  });
}
