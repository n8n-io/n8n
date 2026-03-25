import { asyncScheduler } from '../scheduler/async';
import { Subscription } from '../Subscription';
import { MonoTypeOperatorFunction, SchedulerAction, SchedulerLike } from '../types';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';

/**
 * Emits a notification from the source Observable only after a particular time span
 * has passed without another source emission.
 *
 * <span class="informal">It's like {@link delay}, but passes only the most
 * recent notification from each burst of emissions.</span>
 *
 * ![](debounceTime.png)
 *
 * `debounceTime` delays notifications emitted by the source Observable, but drops
 * previous pending delayed emissions if a new notification arrives on the source
 * Observable. This operator keeps track of the most recent notification from the
 * source Observable, and emits that only when `dueTime` has passed
 * without any other notification appearing on the source Observable. If a new value
 * appears before `dueTime` silence occurs, the previous notification will be dropped
 * and will not be emitted and a new `dueTime` is scheduled.
 * If the completing event happens during `dueTime` the last cached notification
 * is emitted before the completion event is forwarded to the output observable.
 * If the error event happens during `dueTime` or after it only the error event is
 * forwarded to the output observable. The cache notification is not emitted in this case.
 *
 * This is a rate-limiting operator, because it is impossible for more than one
 * notification to be emitted in any time window of duration `dueTime`, but it is also
 * a delay-like operator since output emissions do not occur at the same time as
 * they did on the source Observable. Optionally takes a {@link SchedulerLike} for
 * managing timers.
 *
 * ## Example
 *
 * Emit the most recent click after a burst of clicks
 *
 * ```ts
 * import { fromEvent, debounceTime } from 'rxjs';
 *
 * const clicks = fromEvent(document, 'click');
 * const result = clicks.pipe(debounceTime(1000));
 * result.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link audit}
 * @see {@link auditTime}
 * @see {@link debounce}
 * @see {@link sample}
 * @see {@link sampleTime}
 * @see {@link throttle}
 * @see {@link throttleTime}
 *
 * @param {number} dueTime The timeout duration in milliseconds (or the time
 * unit determined internally by the optional `scheduler`) for the window of
 * time required to wait for emission silence before emitting the most recent
 * source value.
 * @param {SchedulerLike} [scheduler=async] The {@link SchedulerLike} to use for
 * managing the timers that handle the timeout for each value.
 * @return A function that returns an Observable that delays the emissions of
 * the source Observable by the specified `dueTime`, and may drop some values
 * if they occur too frequently.
 */
export function debounceTime<T>(dueTime: number, scheduler: SchedulerLike = asyncScheduler): MonoTypeOperatorFunction<T> {
  return operate((source, subscriber) => {
    let activeTask: Subscription | null = null;
    let lastValue: T | null = null;
    let lastTime: number | null = null;

    const emit = () => {
      if (activeTask) {
        // We have a value! Free up memory first, then emit the value.
        activeTask.unsubscribe();
        activeTask = null;
        const value = lastValue!;
        lastValue = null;
        subscriber.next(value);
      }
    };
    function emitWhenIdle(this: SchedulerAction<unknown>) {
      // This is called `dueTime` after the first value
      // but we might have received new values during this window!

      const targetTime = lastTime! + dueTime;
      const now = scheduler.now();
      if (now < targetTime) {
        // On that case, re-schedule to the new target
        activeTask = this.schedule(undefined, targetTime - now);
        subscriber.add(activeTask);
        return;
      }

      emit();
    }

    source.subscribe(
      createOperatorSubscriber(
        subscriber,
        (value: T) => {
          lastValue = value;
          lastTime = scheduler.now();

          // Only set up a task if it's not already up
          if (!activeTask) {
            activeTask = scheduler.schedule(emitWhenIdle, dueTime);
            subscriber.add(activeTask);
          }
        },
        () => {
          // Source completed.
          // Emit any pending debounced values then complete
          emit();
          subscriber.complete();
        },
        // Pass all errors through to consumer.
        undefined,
        () => {
          // Finalization.
          lastValue = activeTask = null;
        }
      )
    );
  });
}
