import { Subscriber } from '../Subscriber';
import { Observable } from '../Observable';
import { Subject } from '../Subject';
import { ObservableInput, OperatorFunction } from '../types';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { innerFrom } from '../observable/innerFrom';

/**
 * Branch out the source Observable values as a nested Observable using a
 * factory function of closing Observables to determine when to start a new
 * window.
 *
 * <span class="informal">It's like {@link bufferWhen}, but emits a nested
 * Observable instead of an array.</span>
 *
 * ![](windowWhen.png)
 *
 * Returns an Observable that emits windows of items it collects from the source
 * Observable. The output Observable emits connected, non-overlapping windows.
 * It emits the current window and opens a new one whenever the Observable
 * produced by the specified `closingSelector` function emits an item. The first
 * window is opened immediately when subscribing to the output Observable.
 *
 * ## Example
 *
 * Emit only the first two clicks events in every window of [1-5] random seconds
 *
 * ```ts
 * import { fromEvent, windowWhen, interval, map, take, mergeAll } from 'rxjs';
 *
 * const clicks = fromEvent(document, 'click');
 * const result = clicks.pipe(
 *   windowWhen(() => interval(1000 + Math.random() * 4000)),
 *   map(win => win.pipe(take(2))), // take at most 2 emissions from each window
 *   mergeAll()                     // flatten the Observable-of-Observables
 * );
 * result.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link window}
 * @see {@link windowCount}
 * @see {@link windowTime}
 * @see {@link windowToggle}
 * @see {@link bufferWhen}
 *
 * @param {function(): Observable} closingSelector A function that takes no
 * arguments and returns an Observable that signals (on either `next` or
 * `complete`) when to close the previous window and start a new one.
 * @return A function that returns an Observable of windows, which in turn are
 * Observables.
 */
export function windowWhen<T>(closingSelector: () => ObservableInput<any>): OperatorFunction<T, Observable<T>> {
  return operate((source, subscriber) => {
    let window: Subject<T> | null;
    let closingSubscriber: Subscriber<any> | undefined;

    /**
     * When we get an error, we have to notify both the
     * destination subscriber and the window.
     */
    const handleError = (err: any) => {
      window!.error(err);
      subscriber.error(err);
    };

    /**
     * Called every time we need to open a window.
     * Recursive, as it will start the closing notifier, which
     * inevitably *should* call openWindow -- but may not if
     * it is a "never" observable.
     */
    const openWindow = () => {
      // We need to clean up our closing subscription,
      // we only cared about the first next or complete notification.
      closingSubscriber?.unsubscribe();

      // Close our window before starting a new one.
      window?.complete();

      // Start the new window.
      window = new Subject<T>();
      subscriber.next(window.asObservable());

      // Get our closing notifier.
      let closingNotifier: Observable<any>;
      try {
        closingNotifier = innerFrom(closingSelector());
      } catch (err) {
        handleError(err);
        return;
      }

      // Subscribe to the closing notifier, be sure
      // to capture the subscriber (aka Subscription)
      // so we can clean it up when we close the window
      // and open a new one.
      closingNotifier.subscribe((closingSubscriber = createOperatorSubscriber(subscriber, openWindow, openWindow, handleError)));
    };

    // Start the first window.
    openWindow();

    // Subscribe to the source
    source.subscribe(
      createOperatorSubscriber(
        subscriber,
        (value) => window!.next(value),
        () => {
          // The source completed, close the window and complete.
          window!.complete();
          subscriber.complete();
        },
        handleError,
        () => {
          // Be sure to clean up our closing subscription
          // when this tears down.
          closingSubscriber?.unsubscribe();
          window = null!;
        }
      )
    );
  });
}
