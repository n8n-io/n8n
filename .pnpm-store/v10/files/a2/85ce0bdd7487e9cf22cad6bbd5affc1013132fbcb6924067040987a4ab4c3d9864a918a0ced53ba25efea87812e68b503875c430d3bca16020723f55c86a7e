import { Observable } from '../Observable';
import { SchedulerLike } from '../types';
import { async as asyncScheduler } from '../scheduler/async';
import { isScheduler } from '../util/isScheduler';
import { isValidDate } from '../util/isDate';

/**
 * Creates an observable that will wait for a specified time period, or exact date, before
 * emitting the number 0.
 *
 * <span class="informal">Used to emit a notification after a delay.</span>
 *
 * This observable is useful for creating delays in code, or racing against other values
 * for ad-hoc timeouts.
 *
 * The `delay` is specified by default in milliseconds, however providing a custom scheduler could
 * create a different behavior.
 *
 * ## Examples
 *
 * Wait 3 seconds and start another observable
 *
 * You might want to use `timer` to delay subscription to an
 * observable by a set amount of time. Here we use a timer with
 * {@link concatMapTo} or {@link concatMap} in order to wait
 * a few seconds and start a subscription to a source.
 *
 * ```ts
 * import { of, timer, concatMap } from 'rxjs';
 *
 * // This could be any observable
 * const source = of(1, 2, 3);
 *
 * timer(3000)
 *   .pipe(concatMap(() => source))
 *   .subscribe(console.log);
 * ```
 *
 * Take all values until the start of the next minute
 *
 * Using a `Date` as the trigger for the first emission, you can
 * do things like wait until midnight to fire an event, or in this case,
 * wait until a new minute starts (chosen so the example wouldn't take
 * too long to run) in order to stop watching a stream. Leveraging
 * {@link takeUntil}.
 *
 * ```ts
 * import { interval, takeUntil, timer } from 'rxjs';
 *
 * // Build a Date object that marks the
 * // next minute.
 * const currentDate = new Date();
 * const startOfNextMinute = new Date(
 *   currentDate.getFullYear(),
 *   currentDate.getMonth(),
 *   currentDate.getDate(),
 *   currentDate.getHours(),
 *   currentDate.getMinutes() + 1
 * );
 *
 * // This could be any observable stream
 * const source = interval(1000);
 *
 * const result = source.pipe(
 *   takeUntil(timer(startOfNextMinute))
 * );
 *
 * result.subscribe(console.log);
 * ```
 *
 * ### Known Limitations
 *
 * - The {@link asyncScheduler} uses `setTimeout` which has limitations for how far in the future it can be scheduled.
 *
 * - If a `scheduler` is provided that returns a timestamp other than an epoch from `now()`, and
 * a `Date` object is passed to the `dueTime` argument, the calculation for when the first emission
 * should occur will be incorrect. In this case, it would be best to do your own calculations
 * ahead of time, and pass a `number` in as the `dueTime`.
 *
 * @param due If a `number`, the amount of time in milliseconds to wait before emitting.
 * If a `Date`, the exact time at which to emit.
 * @param scheduler The scheduler to use to schedule the delay. Defaults to {@link asyncScheduler}.
 */
export function timer(due: number | Date, scheduler?: SchedulerLike): Observable<0>;

/**
 * Creates an observable that starts an interval after a specified delay, emitting incrementing numbers -- starting at `0` --
 * on each interval after words.
 *
 * The `delay` and `intervalDuration` are specified by default in milliseconds, however providing a custom scheduler could
 * create a different behavior.
 *
 * ## Example
 *
 * ### Start an interval that starts right away
 *
 * Since {@link interval} waits for the passed delay before starting,
 * sometimes that's not ideal. You may want to start an interval immediately.
 * `timer` works well for this. Here we have both side-by-side so you can
 * see them in comparison.
 *
 * Note that this observable will never complete.
 *
 * ```ts
 * import { timer, interval } from 'rxjs';
 *
 * timer(0, 1000).subscribe(n => console.log('timer', n));
 * interval(1000).subscribe(n => console.log('interval', n));
 * ```
 *
 * ### Known Limitations
 *
 * - The {@link asyncScheduler} uses `setTimeout` which has limitations for how far in the future it can be scheduled.
 *
 * - If a `scheduler` is provided that returns a timestamp other than an epoch from `now()`, and
 * a `Date` object is passed to the `dueTime` argument, the calculation for when the first emission
 * should occur will be incorrect. In this case, it would be best to do your own calculations
 * ahead of time, and pass a `number` in as the `startDue`.
 * @param startDue If a `number`, is the time to wait before starting the interval.
 * If a `Date`, is the exact time at which to start the interval.
 * @param intervalDuration The delay between each value emitted in the interval. Passing a
 * negative number here will result in immediate completion after the first value is emitted, as though
 * no `intervalDuration` was passed at all.
 * @param scheduler The scheduler to use to schedule the delay. Defaults to {@link asyncScheduler}.
 */
export function timer(startDue: number | Date, intervalDuration: number, scheduler?: SchedulerLike): Observable<number>;

/**
 * @deprecated The signature allowing `undefined` to be passed for `intervalDuration` will be removed in v8. Use the `timer(dueTime, scheduler?)` signature instead.
 */
export function timer(dueTime: number | Date, unused: undefined, scheduler?: SchedulerLike): Observable<0>;

export function timer(
  dueTime: number | Date = 0,
  intervalOrScheduler?: number | SchedulerLike,
  scheduler: SchedulerLike = asyncScheduler
): Observable<number> {
  // Since negative intervalDuration is treated as though no
  // interval was specified at all, we start with a negative number.
  let intervalDuration = -1;

  if (intervalOrScheduler != null) {
    // If we have a second argument, and it's a scheduler,
    // override the scheduler we had defaulted. Otherwise,
    // it must be an interval.
    if (isScheduler(intervalOrScheduler)) {
      scheduler = intervalOrScheduler;
    } else {
      // Note that this *could* be negative, in which case
      // it's like not passing an intervalDuration at all.
      intervalDuration = intervalOrScheduler;
    }
  }

  return new Observable((subscriber) => {
    // If a valid date is passed, calculate how long to wait before
    // executing the first value... otherwise, if it's a number just schedule
    // that many milliseconds (or scheduler-specified unit size) in the future.
    let due = isValidDate(dueTime) ? +dueTime - scheduler!.now() : dueTime;

    if (due < 0) {
      // Ensure we don't schedule in the future.
      due = 0;
    }

    // The incrementing value we emit.
    let n = 0;

    // Start the timer.
    return scheduler.schedule(function () {
      if (!subscriber.closed) {
        // Emit the next value and increment.
        subscriber.next(n++);

        if (0 <= intervalDuration) {
          // If we have a interval after the initial timer,
          // reschedule with the period.
          this.schedule(undefined, intervalDuration);
        } else {
          // We didn't have an interval. So just complete.
          subscriber.complete();
        }
      }
    }, due);
  });
}
