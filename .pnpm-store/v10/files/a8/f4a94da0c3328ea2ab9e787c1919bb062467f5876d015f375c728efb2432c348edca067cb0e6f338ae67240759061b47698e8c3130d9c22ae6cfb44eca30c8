import { SchedulerLike } from '../types';
import { Observable } from '../Observable';
import { EMPTY } from './empty';

export function range(start: number, count?: number): Observable<number>;

/**
 * @deprecated The `scheduler` parameter will be removed in v8. Use `range(start, count).pipe(observeOn(scheduler))` instead. Details: Details: https://rxjs.dev/deprecations/scheduler-argument
 */
export function range(start: number, count: number | undefined, scheduler: SchedulerLike): Observable<number>;

/**
 * Creates an Observable that emits a sequence of numbers within a specified
 * range.
 *
 * <span class="informal">Emits a sequence of numbers in a range.</span>
 *
 * ![](range.png)
 *
 * `range` operator emits a range of sequential integers, in order, where you
 * select the `start` of the range and its `length`. By default, uses no
 * {@link SchedulerLike} and just delivers the notifications synchronously, but may use
 * an optional {@link SchedulerLike} to regulate those deliveries.
 *
 * ## Example
 *
 * Produce a range of numbers
 *
 * ```ts
 * import { range } from 'rxjs';
 *
 * const numbers = range(1, 3);
 *
 * numbers.subscribe({
 *   next: value => console.log(value),
 *   complete: () => console.log('Complete!')
 * });
 *
 * // Logs:
 * // 1
 * // 2
 * // 3
 * // 'Complete!'
 * ```
 *
 * @see {@link timer}
 * @see {@link interval}
 *
 * @param {number} [start=0] The value of the first integer in the sequence.
 * @param {number} count The number of sequential integers to generate.
 * @param {SchedulerLike} [scheduler] A {@link SchedulerLike} to use for scheduling
 * the emissions of the notifications.
 * @return {Observable} An Observable of numbers that emits a finite range of
 * sequential integers.
 */
export function range(start: number, count?: number, scheduler?: SchedulerLike): Observable<number> {
  if (count == null) {
    // If one argument was passed, it's the count, not the start.
    count = start;
    start = 0;
  }

  if (count <= 0) {
    // No count? We're going nowhere. Return EMPTY.
    return EMPTY;
  }

  // Where the range should stop.
  const end = count + start;

  return new Observable(
    scheduler
      ? // The deprecated scheduled path.
        (subscriber) => {
          let n = start;
          return scheduler.schedule(function () {
            if (n < end) {
              subscriber.next(n++);
              this.schedule();
            } else {
              subscriber.complete();
            }
          });
        }
      : // Standard synchronous range.
        (subscriber) => {
          let n = start;
          while (n < end && !subscriber.closed) {
            subscriber.next(n++);
          }
          subscriber.complete();
        }
  );
}
