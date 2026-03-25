import { Observable } from '../Observable';
import { OperatorFunction, ObservableInput } from '../types';
import { Subject } from '../Subject';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { noop } from '../util/noop';
import { innerFrom } from '../observable/innerFrom';

/**
 * Branch out the source Observable values as a nested Observable whenever
 * `windowBoundaries` emits.
 *
 * <span class="informal">It's like {@link buffer}, but emits a nested Observable
 * instead of an array.</span>
 *
 * ![](window.png)
 *
 * Returns an Observable that emits windows of items it collects from the source
 * Observable. The output Observable emits connected, non-overlapping
 * windows. It emits the current window and opens a new one whenever the
 * `windowBoundaries` emits an item. `windowBoundaries` can be any type that
 * `ObservableInput` accepts. It internally gets converted to an Observable.
 * Because each window is an Observable, the output is a higher-order Observable.
 *
 * ## Example
 *
 * In every window of 1 second each, emit at most 2 click events
 *
 * ```ts
 * import { fromEvent, interval, window, map, take, mergeAll } from 'rxjs';
 *
 * const clicks = fromEvent(document, 'click');
 * const sec = interval(1000);
 * const result = clicks.pipe(
 *   window(sec),
 *   map(win => win.pipe(take(2))), // take at most 2 emissions from each window
 *   mergeAll()                     // flatten the Observable-of-Observables
 * );
 * result.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link windowCount}
 * @see {@link windowTime}
 * @see {@link windowToggle}
 * @see {@link windowWhen}
 * @see {@link buffer}
 *
 * @param windowBoundaries An `ObservableInput` that completes the
 * previous window and starts a new window.
 * @return A function that returns an Observable of windows, which are
 * Observables emitting values of the source Observable.
 */
export function window<T>(windowBoundaries: ObservableInput<any>): OperatorFunction<T, Observable<T>> {
  return operate((source, subscriber) => {
    let windowSubject: Subject<T> = new Subject<T>();

    subscriber.next(windowSubject.asObservable());

    const errorHandler = (err: any) => {
      windowSubject.error(err);
      subscriber.error(err);
    };

    // Subscribe to our source
    source.subscribe(
      createOperatorSubscriber(
        subscriber,
        (value) => windowSubject?.next(value),
        () => {
          windowSubject.complete();
          subscriber.complete();
        },
        errorHandler
      )
    );

    // Subscribe to the window boundaries.
    innerFrom(windowBoundaries).subscribe(
      createOperatorSubscriber(
        subscriber,
        () => {
          windowSubject.complete();
          subscriber.next((windowSubject = new Subject()));
        },
        noop,
        errorHandler
      )
    );

    return () => {
      // Unsubscribing the subject ensures that anyone who has captured
      // a reference to this window that tries to use it after it can
      // no longer get values from the source will get an ObjectUnsubscribedError.
      windowSubject?.unsubscribe();
      windowSubject = null!;
    };
  });
}
