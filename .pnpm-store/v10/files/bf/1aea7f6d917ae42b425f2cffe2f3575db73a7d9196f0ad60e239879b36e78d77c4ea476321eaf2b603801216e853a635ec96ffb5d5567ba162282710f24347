import { Subject } from '../Subject';
import { asyncScheduler } from '../scheduler/async';
import { Observable } from '../Observable';
import { Subscription } from '../Subscription';
import { Observer, OperatorFunction, SchedulerLike } from '../types';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { arrRemove } from '../util/arrRemove';
import { popScheduler } from '../util/args';
import { executeSchedule } from '../util/executeSchedule';

export function windowTime<T>(windowTimeSpan: number, scheduler?: SchedulerLike): OperatorFunction<T, Observable<T>>;
export function windowTime<T>(
  windowTimeSpan: number,
  windowCreationInterval: number,
  scheduler?: SchedulerLike
): OperatorFunction<T, Observable<T>>;
export function windowTime<T>(
  windowTimeSpan: number,
  windowCreationInterval: number | null | void,
  maxWindowSize: number,
  scheduler?: SchedulerLike
): OperatorFunction<T, Observable<T>>;

/**
 * Branch out the source Observable values as a nested Observable periodically
 * in time.
 *
 * <span class="informal">It's like {@link bufferTime}, but emits a nested
 * Observable instead of an array.</span>
 *
 * ![](windowTime.png)
 *
 * Returns an Observable that emits windows of items it collects from the source
 * Observable. The output Observable starts a new window periodically, as
 * determined by the `windowCreationInterval` argument. It emits each window
 * after a fixed timespan, specified by the `windowTimeSpan` argument. When the
 * source Observable completes or encounters an error, the output Observable
 * emits the current window and propagates the notification from the source
 * Observable. If `windowCreationInterval` is not provided, the output
 * Observable starts a new window when the previous window of duration
 * `windowTimeSpan` completes. If `maxWindowCount` is provided, each window
 * will emit at most fixed number of values. Window will complete immediately
 * after emitting last value and next one still will open as specified by
 * `windowTimeSpan` and `windowCreationInterval` arguments.
 *
 * ## Examples
 *
 * In every window of 1 second each, emit at most 2 click events
 *
 * ```ts
 * import { fromEvent, windowTime, map, take, mergeAll } from 'rxjs';
 *
 * const clicks = fromEvent(document, 'click');
 * const result = clicks.pipe(
 *   windowTime(1000),
 *   map(win => win.pipe(take(2))), // take at most 2 emissions from each window
 *   mergeAll()                     // flatten the Observable-of-Observables
 * );
 * result.subscribe(x => console.log(x));
 * ```
 *
 * Every 5 seconds start a window 1 second long, and emit at most 2 click events per window
 *
 * ```ts
 * import { fromEvent, windowTime, map, take, mergeAll } from 'rxjs';
 *
 * const clicks = fromEvent(document, 'click');
 * const result = clicks.pipe(
 *   windowTime(1000, 5000),
 *   map(win => win.pipe(take(2))), // take at most 2 emissions from each window
 *   mergeAll()                     // flatten the Observable-of-Observables
 * );
 * result.subscribe(x => console.log(x));
 * ```
 *
 * Same as example above but with `maxWindowCount` instead of `take`
 *
 * ```ts
 * import { fromEvent, windowTime, mergeAll } from 'rxjs';
 *
 * const clicks = fromEvent(document, 'click');
 * const result = clicks.pipe(
 *   windowTime(1000, 5000, 2), // take at most 2 emissions from each window
 *   mergeAll()                 // flatten the Observable-of-Observables
 * );
 * result.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link window}
 * @see {@link windowCount}
 * @see {@link windowToggle}
 * @see {@link windowWhen}
 * @see {@link bufferTime}
 *
 * @param windowTimeSpan The amount of time, in milliseconds, to fill each window.
 * @param windowCreationInterval The interval at which to start new
 * windows.
 * @param maxWindowSize Max number of
 * values each window can emit before completion.
 * @param scheduler The scheduler on which to schedule the
 * intervals that determine window boundaries.
 * @return A function that returns an Observable of windows, which in turn are
 * Observables.
 */
export function windowTime<T>(windowTimeSpan: number, ...otherArgs: any[]): OperatorFunction<T, Observable<T>> {
  const scheduler = popScheduler(otherArgs) ?? asyncScheduler;
  const windowCreationInterval = (otherArgs[0] as number) ?? null;
  const maxWindowSize = (otherArgs[1] as number) || Infinity;

  return operate((source, subscriber) => {
    // The active windows, their related subscriptions, and removal functions.
    let windowRecords: WindowRecord<T>[] | null = [];
    // If true, it means that every time we close a window, we want to start a new window.
    // This is only really used for when *just* the time span is passed.
    let restartOnClose = false;

    const closeWindow = (record: { window: Subject<T>; subs: Subscription }) => {
      const { window, subs } = record;
      window.complete();
      subs.unsubscribe();
      arrRemove(windowRecords, record);
      restartOnClose && startWindow();
    };

    /**
     * Called every time we start a new window. This also does
     * the work of scheduling the job to close the window.
     */
    const startWindow = () => {
      if (windowRecords) {
        const subs = new Subscription();
        subscriber.add(subs);
        const window = new Subject<T>();
        const record = {
          window,
          subs,
          seen: 0,
        };
        windowRecords.push(record);
        subscriber.next(window.asObservable());
        executeSchedule(subs, scheduler, () => closeWindow(record), windowTimeSpan);
      }
    };

    if (windowCreationInterval !== null && windowCreationInterval >= 0) {
      // The user passed both a windowTimeSpan (required), and a creation interval
      // That means we need to start new window on the interval, and those windows need
      // to wait the required time span before completing.
      executeSchedule(subscriber, scheduler, startWindow, windowCreationInterval, true);
    } else {
      restartOnClose = true;
    }

    startWindow();

    /**
     * We need to loop over a copy of the window records several times in this operator.
     * This is to save bytes over the wire more than anything.
     * The reason we copy the array is that reentrant code could mutate the array while
     * we are iterating over it.
     */
    const loop = (cb: (record: WindowRecord<T>) => void) => windowRecords!.slice().forEach(cb);

    /**
     * Used to notify all of the windows and the subscriber in the same way
     * in the error and complete handlers.
     */
    const terminate = (cb: (consumer: Observer<any>) => void) => {
      loop(({ window }) => cb(window));
      cb(subscriber);
      subscriber.unsubscribe();
    };

    source.subscribe(
      createOperatorSubscriber(
        subscriber,
        (value: T) => {
          // Notify all windows of the value.
          loop((record) => {
            record.window.next(value);
            // If the window is over the max size, we need to close it.
            maxWindowSize <= ++record.seen && closeWindow(record);
          });
        },
        // Complete the windows and the downstream subscriber and clean up.
        () => terminate((consumer) => consumer.complete()),
        // Notify the windows and the downstream subscriber of the error and clean up.
        (err) => terminate((consumer) => consumer.error(err))
      )
    );

    // Additional finalization. This will be called when the
    // destination tears down. Other finalizations are registered implicitly
    // above via subscription.
    return () => {
      // Ensure that the buffer is released.
      windowRecords = null!;
    };
  });
}

interface WindowRecord<T> {
  seen: number;
  window: Subject<T>;
  subs: Subscription;
}
