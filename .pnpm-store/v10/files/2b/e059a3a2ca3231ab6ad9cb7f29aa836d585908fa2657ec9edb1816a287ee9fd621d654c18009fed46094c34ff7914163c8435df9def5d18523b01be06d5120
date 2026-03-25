import { Subscriber } from '../Subscriber';
import { ObservableInput, OperatorFunction } from '../types';
import { operate } from '../util/lift';
import { noop } from '../util/noop';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { innerFrom } from '../observable/innerFrom';

/**
 * Buffers the source Observable values, using a factory function of closing
 * Observables to determine when to close, emit, and reset the buffer.
 *
 * <span class="informal">Collects values from the past as an array. When it
 * starts collecting values, it calls a function that returns an Observable that
 * tells when to close the buffer and restart collecting.</span>
 *
 * ![](bufferWhen.svg)
 *
 * Opens a buffer immediately, then closes the buffer when the observable
 * returned by calling `closingSelector` function emits a value. When it closes
 * the buffer, it immediately opens a new buffer and repeats the process.
 *
 * ## Example
 *
 * Emit an array of the last clicks every [1-5] random seconds
 *
 * ```ts
 * import { fromEvent, bufferWhen, interval } from 'rxjs';
 *
 * const clicks = fromEvent(document, 'click');
 * const buffered = clicks.pipe(
 *   bufferWhen(() => interval(1000 + Math.random() * 4000))
 * );
 * buffered.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link buffer}
 * @see {@link bufferCount}
 * @see {@link bufferTime}
 * @see {@link bufferToggle}
 * @see {@link windowWhen}
 *
 * @param {function(): Observable} closingSelector A function that takes no
 * arguments and returns an Observable that signals buffer closure.
 * @return A function that returns an Observable of arrays of buffered values.
 */
export function bufferWhen<T>(closingSelector: () => ObservableInput<any>): OperatorFunction<T, T[]> {
  return operate((source, subscriber) => {
    // The buffer we keep and emit.
    let buffer: T[] | null = null;
    // A reference to the subscriber used to subscribe to
    // the closing notifier. We need to hold this so we can
    // end the subscription after the first notification.
    let closingSubscriber: Subscriber<T> | null = null;

    // Ends the previous closing notifier subscription, so it
    // terminates after the first emission, then emits
    // the current buffer  if there is one, starts a new buffer, and starts a
    // new closing notifier.
    const openBuffer = () => {
      // Make sure to finalize the closing subscription, we only cared
      // about one notification.
      closingSubscriber?.unsubscribe();
      // emit the buffer if we have one, and start a new buffer.
      const b = buffer;
      buffer = [];
      b && subscriber.next(b);

      // Get a new closing notifier and subscribe to it.
      innerFrom(closingSelector()).subscribe((closingSubscriber = createOperatorSubscriber(subscriber, openBuffer, noop)));
    };

    // Start the first buffer.
    openBuffer();

    // Subscribe to our source.
    source.subscribe(
      createOperatorSubscriber(
        subscriber,
        // Add every new value to the current buffer.
        (value) => buffer?.push(value),
        // When we complete, emit the buffer if we have one,
        // then complete the result.
        () => {
          buffer && subscriber.next(buffer);
          subscriber.complete();
        },
        // Pass all errors through to consumer.
        undefined,
        // Release memory on finalization
        () => (buffer = closingSubscriber = null!)
      )
    );
  });
}
