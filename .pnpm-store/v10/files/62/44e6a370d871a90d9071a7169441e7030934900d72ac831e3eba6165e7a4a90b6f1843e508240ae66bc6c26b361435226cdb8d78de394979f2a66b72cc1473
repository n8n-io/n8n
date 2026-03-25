import { async } from '../scheduler/async';
import { isValidDate } from '../util/isDate';
import { ObservableInput, OperatorFunction, SchedulerLike } from '../types';
import { timeout } from './timeout';

/** @deprecated Replaced with {@link timeout}. Instead of `timeoutWith(someDate, a$, scheduler)`, use the configuration object
 * `timeout({ first: someDate, with: () => a$, scheduler })`. Will be removed in v8. */
export function timeoutWith<T, R>(dueBy: Date, switchTo: ObservableInput<R>, scheduler?: SchedulerLike): OperatorFunction<T, T | R>;
/** @deprecated Replaced with {@link timeout}. Instead of `timeoutWith(100, a$, scheduler)`, use the configuration object
 *  `timeout({ each: 100, with: () => a$, scheduler })`. Will be removed in v8. */
export function timeoutWith<T, R>(waitFor: number, switchTo: ObservableInput<R>, scheduler?: SchedulerLike): OperatorFunction<T, T | R>;

/**
 * When the passed timespan elapses before the source emits any given value, it will unsubscribe from the source,
 * and switch the subscription to another observable.
 *
 * <span class="informal">Used to switch to a different observable if your source is being slow.</span>
 *
 * Useful in cases where:
 *
 * - You want to switch to a different source that may be faster.
 * - You want to notify a user that the data stream is slow.
 * - You want to emit a custom error rather than the {@link TimeoutError} emitted
 *   by the default usage of {@link timeout}.
 *
 * If the first parameter is passed as Date and the time of the Date arrives before the first value arrives from the source,
 * it will unsubscribe from the source and switch the subscription to another observable.
 *
 * <span class="informal">Use Date object to switch to a different observable if the first value doesn't arrive by a specific time.</span>
 *
 * Can be used to set a timeout only for the first value, however it's recommended to use the {@link timeout} operator with
 * the `first` configuration to get the same effect.
 *
 * ## Examples
 *
 * Fallback to a faster observable
 *
 * ```ts
 * import { interval, timeoutWith } from 'rxjs';
 *
 * const slow$ = interval(1000);
 * const faster$ = interval(500);
 *
 * slow$
 *   .pipe(timeoutWith(900, faster$))
 *   .subscribe(console.log);
 * ```
 *
 * Emit your own custom timeout error
 *
 * ```ts
 * import { interval, timeoutWith, throwError } from 'rxjs';
 *
 * class CustomTimeoutError extends Error {
 *   constructor() {
 *     super('It was too slow');
 *     this.name = 'CustomTimeoutError';
 *   }
 * }
 *
 * const slow$ = interval(1000);
 *
 * slow$
 *   .pipe(timeoutWith(900, throwError(() => new CustomTimeoutError())))
 *   .subscribe({
 *     error: err => console.error(err.message)
 *   });
 * ```
 *
 * @see {@link timeout}
 *
 * @param due When passed a number, used as the time (in milliseconds) allowed between each value from the source before timeout
 * is triggered. When passed a Date, used as the exact time at which the timeout will be triggered if the first value does not arrive.
 * @param withObservable The observable to switch to when timeout occurs.
 * @param scheduler The scheduler to use with time-related operations within this operator. Defaults to {@link asyncScheduler}
 * @return A function that returns an Observable that mirrors behaviour of the
 * source Observable, unless timeout happens when it starts emitting values
 * from the `ObservableInput` passed as a second parameter.
 * @deprecated Replaced with {@link timeout}. Instead of `timeoutWith(100, a$, scheduler)`, use {@link timeout} with the configuration
 * object: `timeout({ each: 100, with: () => a$, scheduler })`. Instead of `timeoutWith(someDate, a$, scheduler)`, use {@link timeout}
 * with the configuration object: `timeout({ first: someDate, with: () => a$, scheduler })`. Will be removed in v8.
 */
export function timeoutWith<T, R>(
  due: number | Date,
  withObservable: ObservableInput<R>,
  scheduler?: SchedulerLike
): OperatorFunction<T, T | R> {
  let first: number | Date | undefined;
  let each: number | undefined;
  let _with: () => ObservableInput<R>;
  scheduler = scheduler ?? async;

  if (isValidDate(due)) {
    first = due;
  } else if (typeof due === 'number') {
    each = due;
  }

  if (withObservable) {
    _with = () => withObservable;
  } else {
    throw new TypeError('No observable provided to switch to');
  }

  if (first == null && each == null) {
    // Ensure timeout was provided at runtime.
    throw new TypeError('No timeout provided.');
  }

  return timeout<T, ObservableInput<R>>({
    first,
    each,
    scheduler,
    with: _with,
  });
}
