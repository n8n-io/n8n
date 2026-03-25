import { Subscriber } from '../Subscriber';
import { MonoTypeOperatorFunction, ObservableInput } from '../types';
import { operate } from '../util/lift';
import { noop } from '../util/noop';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { innerFrom } from '../observable/innerFrom';

/**
 * Emits a notification from the source Observable only after a particular time span
 * determined by another Observable has passed without another source emission.
 *
 * <span class="informal">It's like {@link debounceTime}, but the time span of
 * emission silence is determined by a second Observable.</span>
 *
 * ![](debounce.svg)
 *
 * `debounce` delays notifications emitted by the source Observable, but drops previous
 * pending delayed emissions if a new notification arrives on the source Observable.
 * This operator keeps track of the most recent notification from the source
 * Observable, and spawns a duration Observable by calling the
 * `durationSelector` function. The notification is emitted only when the duration
 * Observable emits a next notification, and if no other notification was emitted on
 * the source Observable since the duration Observable was spawned. If a new
 * notification appears before the duration Observable emits, the previous notification will
 * not be emitted and a new duration is scheduled from `durationSelector` is scheduled.
 * If the completing event happens during the scheduled duration the last cached notification
 * is emitted before the completion event is forwarded to the output observable.
 * If the error event happens during the scheduled duration or after it only the error event is
 * forwarded to the output observable. The cache notification is not emitted in this case.
 *
 * Like {@link debounceTime}, this is a rate-limiting operator, and also a
 * delay-like operator since output emissions do not necessarily occur at the
 * same time as they did on the source Observable.
 *
 * ## Example
 *
 * Emit the most recent click after a burst of clicks
 *
 * ```ts
 * import { fromEvent, scan, debounce, interval } from 'rxjs';
 *
 * const clicks = fromEvent(document, 'click');
 * const result = clicks.pipe(
 *   scan(i => ++i, 1),
 *   debounce(i => interval(200 * i))
 * );
 * result.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link audit}
 * @see {@link auditTime}
 * @see {@link debounceTime}
 * @see {@link delay}
 * @see {@link sample}
 * @see {@link sampleTime}
 * @see {@link throttle}
 * @see {@link throttleTime}
 *
 * @param durationSelector A function
 * that receives a value from the source Observable, for computing the timeout
 * duration for each source value, returned as an Observable or a Promise.
 * @return A function that returns an Observable that delays the emissions of
 * the source Observable by the specified duration Observable returned by
 * `durationSelector`, and may drop some values if they occur too frequently.
 */
export function debounce<T>(durationSelector: (value: T) => ObservableInput<any>): MonoTypeOperatorFunction<T> {
  return operate((source, subscriber) => {
    let hasValue = false;
    let lastValue: T | null = null;
    // The subscriber/subscription for the current debounce, if there is one.
    let durationSubscriber: Subscriber<any> | null = null;

    const emit = () => {
      // Unsubscribe any current debounce subscription we have,
      // we only cared about the first notification from it, and we
      // want to clean that subscription up as soon as possible.
      durationSubscriber?.unsubscribe();
      durationSubscriber = null;
      if (hasValue) {
        // We have a value! Free up memory first, then emit the value.
        hasValue = false;
        const value = lastValue!;
        lastValue = null;
        subscriber.next(value);
      }
    };

    source.subscribe(
      createOperatorSubscriber(
        subscriber,
        (value: T) => {
          // Cancel any pending debounce duration. We don't
          // need to null it out here yet tho, because we're just going
          // to create another one in a few lines.
          durationSubscriber?.unsubscribe();
          hasValue = true;
          lastValue = value;
          // Capture our duration subscriber, so we can unsubscribe it when we're notified
          // and we're going to emit the value.
          durationSubscriber = createOperatorSubscriber(subscriber, emit, noop);
          // Subscribe to the duration.
          innerFrom(durationSelector(value)).subscribe(durationSubscriber);
        },
        () => {
          // Source completed.
          // Emit any pending debounced values then complete
          emit();
          subscriber.complete();
        },
        // Pass all errors through to consumer
        undefined,
        () => {
          // Finalization.
          lastValue = durationSubscriber = null;
        }
      )
    );
  });
}
