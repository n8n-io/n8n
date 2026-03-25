import { Subscription } from '../Subscription';
import { OperatorFunction, ObservableInput } from '../types';
import { operate } from '../util/lift';
import { innerFrom } from '../observable/innerFrom';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { noop } from '../util/noop';
import { arrRemove } from '../util/arrRemove';

/**
 * Buffers the source Observable values starting from an emission from
 * `openings` and ending when the output of `closingSelector` emits.
 *
 * <span class="informal">Collects values from the past as an array. Starts
 * collecting only when `opening` emits, and calls the `closingSelector`
 * function to get an Observable that tells when to close the buffer.</span>
 *
 * ![](bufferToggle.png)
 *
 * Buffers values from the source by opening the buffer via signals from an
 * Observable provided to `openings`, and closing and sending the buffers when
 * a Subscribable or Promise returned by the `closingSelector` function emits.
 *
 * ## Example
 *
 * Every other second, emit the click events from the next 500ms
 *
 * ```ts
 * import { fromEvent, interval, bufferToggle, EMPTY } from 'rxjs';
 *
 * const clicks = fromEvent(document, 'click');
 * const openings = interval(1000);
 * const buffered = clicks.pipe(bufferToggle(openings, i =>
 *   i % 2 ? interval(500) : EMPTY
 * ));
 * buffered.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link buffer}
 * @see {@link bufferCount}
 * @see {@link bufferTime}
 * @see {@link bufferWhen}
 * @see {@link windowToggle}
 *
 * @param openings A Subscribable or Promise of notifications to start new
 * buffers.
 * @param closingSelector A function that takes
 * the value emitted by the `openings` observable and returns a Subscribable or Promise,
 * which, when it emits, signals that the associated buffer should be emitted
 * and cleared.
 * @return A function that returns an Observable of arrays of buffered values.
 */
export function bufferToggle<T, O>(
  openings: ObservableInput<O>,
  closingSelector: (value: O) => ObservableInput<any>
): OperatorFunction<T, T[]> {
  return operate((source, subscriber) => {
    const buffers: T[][] = [];

    // Subscribe to the openings notifier first
    innerFrom(openings).subscribe(
      createOperatorSubscriber(
        subscriber,
        (openValue) => {
          const buffer: T[] = [];
          buffers.push(buffer);
          // We use this composite subscription, so that
          // when the closing notifier emits, we can tear it down.
          const closingSubscription = new Subscription();

          const emitBuffer = () => {
            arrRemove(buffers, buffer);
            subscriber.next(buffer);
            closingSubscription.unsubscribe();
          };

          // The line below will add the subscription to the parent subscriber *and* the closing subscription.
          closingSubscription.add(innerFrom(closingSelector(openValue)).subscribe(createOperatorSubscriber(subscriber, emitBuffer, noop)));
        },
        noop
      )
    );

    source.subscribe(
      createOperatorSubscriber(
        subscriber,
        (value) => {
          // Value from our source. Add it to all pending buffers.
          for (const buffer of buffers) {
            buffer.push(value);
          }
        },
        () => {
          // Source complete. Emit all pending buffers.
          while (buffers.length > 0) {
            subscriber.next(buffers.shift()!);
          }
          subscriber.complete();
        }
      )
    );
  });
}
