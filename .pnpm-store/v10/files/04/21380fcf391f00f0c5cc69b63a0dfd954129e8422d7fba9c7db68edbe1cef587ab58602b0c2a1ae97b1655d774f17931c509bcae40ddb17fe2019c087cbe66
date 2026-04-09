import { asyncScheduler } from '../scheduler/async';
import { SchedulerLike, OperatorFunction } from '../types';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';

/**
 * Emits an object containing the current value, and the time that has
 * passed between emitting the current value and the previous value, which is
 * calculated by using the provided `scheduler`'s `now()` method to retrieve
 * the current time at each emission, then calculating the difference. The `scheduler`
 * defaults to {@link asyncScheduler}, so by default, the `interval` will be in
 * milliseconds.
 *
 * <span class="informal">Convert an Observable that emits items into one that
 * emits indications of the amount of time elapsed between those emissions.</span>
 *
 * ![](timeInterval.png)
 *
 * ## Example
 *
 * Emit interval between current value with the last value
 *
 * ```ts
 * import { interval, timeInterval } from 'rxjs';
 *
 * const seconds = interval(1000);
 *
 * seconds
 *   .pipe(timeInterval())
 *   .subscribe(value => console.log(value));
 *
 * // NOTE: The values will never be this precise,
 * // intervals created with `interval` or `setInterval`
 * // are non-deterministic.
 *
 * // { value: 0, interval: 1000 }
 * // { value: 1, interval: 1000 }
 * // { value: 2, interval: 1000 }
 * ```
 *
 * @param scheduler Scheduler used to get the current time.
 * @return A function that returns an Observable that emits information about
 * value and interval.
 */
export function timeInterval<T>(scheduler: SchedulerLike = asyncScheduler): OperatorFunction<T, TimeInterval<T>> {
  return operate((source, subscriber) => {
    let last = scheduler.now();
    source.subscribe(
      createOperatorSubscriber(subscriber, (value) => {
        const now = scheduler.now();
        const interval = now - last;
        last = now;
        subscriber.next(new TimeInterval(value, interval));
      })
    );
  });
}

// TODO(benlesh): make this an interface, export the interface, but not the implemented class,
// there's no reason users should be manually creating this type.

export class TimeInterval<T> {
  /**
   * @deprecated Internal implementation detail, do not construct directly. Will be made an interface in v8.
   */
  constructor(public value: T, public interval: number) {}
}
