import { asyncScheduler } from '../scheduler/async';
import { throttle, ThrottleConfig } from './throttle';
import { MonoTypeOperatorFunction, SchedulerLike } from '../types';
import { timer } from '../observable/timer';

/**
 * Emits a value from the source Observable, then ignores subsequent source
 * values for `duration` milliseconds, then repeats this process.
 *
 * <span class="informal">Lets a value pass, then ignores source values for the
 * next `duration` milliseconds.</span>
 *
 * ![](throttleTime.png)
 *
 * `throttleTime` emits the source Observable values on the output Observable
 * when its internal timer is disabled, and ignores source values when the timer
 * is enabled. Initially, the timer is disabled. As soon as the first source
 * value arrives, it is forwarded to the output Observable, and then the timer
 * is enabled. After `duration` milliseconds (or the time unit determined
 * internally by the optional `scheduler`) has passed, the timer is disabled,
 * and this process repeats for the next source value. Optionally takes a
 * {@link SchedulerLike} for managing timers.
 *
 * ## Examples
 *
 * ### Limit click rate
 *
 * Emit clicks at a rate of at most one click per second
 *
 * ```ts
 * import { fromEvent, throttleTime } from 'rxjs';
 *
 * const clicks = fromEvent(document, 'click');
 * const result = clicks.pipe(throttleTime(1000));
 *
 * result.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link auditTime}
 * @see {@link debounceTime}
 * @see {@link delay}
 * @see {@link sampleTime}
 * @see {@link throttle}
 *
 * @param duration Time to wait before emitting another value after
 * emitting the last value, measured in milliseconds or the time unit determined
 * internally by the optional `scheduler`.
 * @param scheduler The {@link SchedulerLike} to use for
 * managing the timers that handle the throttling. Defaults to {@link asyncScheduler}.
 * @param config A configuration object to define `leading` and
 * `trailing` behavior. Defaults to `{ leading: true, trailing: false }`.
 * @return A function that returns an Observable that performs the throttle
 * operation to limit the rate of emissions from the source.
 */
export function throttleTime<T>(
  duration: number,
  scheduler: SchedulerLike = asyncScheduler,
  config?: ThrottleConfig
): MonoTypeOperatorFunction<T> {
  const duration$ = timer(duration, scheduler);
  return throttle(() => duration$, config);
}
