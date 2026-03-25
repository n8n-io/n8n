import { MonoTypeOperatorFunction, SchedulerLike, OperatorFunction, ObservableInput, ObservedValueOf } from '../types';
export interface TimeoutConfig<T, O extends ObservableInput<unknown> = ObservableInput<T>, M = unknown> {
    /**
     * The time allowed between values from the source before timeout is triggered.
     */
    each?: number;
    /**
     * The relative time as a `number` in milliseconds, or a specific time as a `Date` object,
     * by which the first value must arrive from the source before timeout is triggered.
     */
    first?: number | Date;
    /**
     * The scheduler to use with time-related operations within this operator. Defaults to {@link asyncScheduler}
     */
    scheduler?: SchedulerLike;
    /**
     * A factory used to create observable to switch to when timeout occurs. Provides
     * a {@link TimeoutInfo} about the source observable's emissions and what delay or
     * exact time triggered the timeout.
     */
    with?: (info: TimeoutInfo<T, M>) => O;
    /**
     * Optional additional metadata you can provide to code that handles
     * the timeout, will be provided through the {@link TimeoutError}.
     * This can be used to help identify the source of a timeout or pass along
     * other information related to the timeout.
     */
    meta?: M;
}
export interface TimeoutInfo<T, M = unknown> {
    /** Optional metadata that was provided to the timeout configuration. */
    readonly meta: M;
    /** The number of messages seen before the timeout */
    readonly seen: number;
    /** The last message seen */
    readonly lastValue: T | null;
}
/**
 * An error emitted when a timeout occurs.
 */
export interface TimeoutError<T = unknown, M = unknown> extends Error {
    /**
     * The information provided to the error by the timeout
     * operation that created the error. Will be `null` if
     * used directly in non-RxJS code with an empty constructor.
     * (Note that using this constructor directly is not recommended,
     * you should create your own errors)
     */
    info: TimeoutInfo<T, M> | null;
}
export interface TimeoutErrorCtor {
    /**
     * @deprecated Internal implementation detail. Do not construct error instances.
     * Cannot be tagged as internal: https://github.com/ReactiveX/rxjs/issues/6269
     */
    new <T = unknown, M = unknown>(info?: TimeoutInfo<T, M>): TimeoutError<T, M>;
}
/**
 * An error thrown by the {@link timeout} operator.
 *
 * Provided so users can use as a type and do quality comparisons.
 * We recommend you do not subclass this or create instances of this class directly.
 * If you have need of a error representing a timeout, you should
 * create your own error class and use that.
 *
 * @see {@link timeout}
 *
 * @class TimeoutError
 */
export declare const TimeoutError: TimeoutErrorCtor;
/**
 * If `with` is provided, this will return an observable that will switch to a different observable if the source
 * does not push values within the specified time parameters.
 *
 * <span class="informal">The most flexible option for creating a timeout behavior.</span>
 *
 * The first thing to know about the configuration is if you do not provide a `with` property to the configuration,
 * when timeout conditions are met, this operator will emit a {@link TimeoutError}. Otherwise, it will use the factory
 * function provided by `with`, and switch your subscription to the result of that. Timeout conditions are provided by
 * the settings in `first` and `each`.
 *
 * The `first` property can be either a `Date` for a specific time, a `number` for a time period relative to the
 * point of subscription, or it can be skipped. This property is to check timeout conditions for the arrival of
 * the first value from the source _only_. The timings of all subsequent values  from the source will be checked
 * against the time period provided by `each`, if it was provided.
 *
 * The `each` property can be either a `number` or skipped. If a value for `each` is provided, it represents the amount of
 * time the resulting observable will wait between the arrival of values from the source before timing out. Note that if
 * `first` is _not_ provided, the value from `each` will be used to check timeout conditions for the arrival of the first
 * value and all subsequent values. If `first` _is_ provided, `each` will only be use to check all values after the first.
 *
 * ## Examples
 *
 * Emit a custom error if there is too much time between values
 *
 * ```ts
 * import { interval, timeout, throwError } from 'rxjs';
 *
 * class CustomTimeoutError extends Error {
 *   constructor() {
 *     super('It was too slow');
 *     this.name = 'CustomTimeoutError';
 *   }
 * }
 *
 * const slow$ = interval(900);
 *
 * slow$.pipe(
 *   timeout({
 *     each: 1000,
 *     with: () => throwError(() => new CustomTimeoutError())
 *   })
 * )
 * .subscribe({
 *   error: console.error
 * });
 * ```
 *
 * Switch to a faster observable if your source is slow.
 *
 * ```ts
 * import { interval, timeout } from 'rxjs';
 *
 * const slow$ = interval(900);
 * const fast$ = interval(500);
 *
 * slow$.pipe(
 *   timeout({
 *     each: 1000,
 *     with: () => fast$,
 *   })
 * )
 * .subscribe(console.log);
 * ```
 * @param config The configuration for the timeout.
 */
export declare function timeout<T, O extends ObservableInput<unknown>, M = unknown>(config: TimeoutConfig<T, O, M> & {
    with: (info: TimeoutInfo<T, M>) => O;
}): OperatorFunction<T, T | ObservedValueOf<O>>;
/**
 * Returns an observable that will error or switch to a different observable if the source does not push values
 * within the specified time parameters.
 *
 * <span class="informal">The most flexible option for creating a timeout behavior.</span>
 *
 * The first thing to know about the configuration is if you do not provide a `with` property to the configuration,
 * when timeout conditions are met, this operator will emit a {@link TimeoutError}. Otherwise, it will use the factory
 * function provided by `with`, and switch your subscription to the result of that. Timeout conditions are provided by
 * the settings in `first` and `each`.
 *
 * The `first` property can be either a `Date` for a specific time, a `number` for a time period relative to the
 * point of subscription, or it can be skipped. This property is to check timeout conditions for the arrival of
 * the first value from the source _only_. The timings of all subsequent values  from the source will be checked
 * against the time period provided by `each`, if it was provided.
 *
 * The `each` property can be either a `number` or skipped. If a value for `each` is provided, it represents the amount of
 * time the resulting observable will wait between the arrival of values from the source before timing out. Note that if
 * `first` is _not_ provided, the value from `each` will be used to check timeout conditions for the arrival of the first
 * value and all subsequent values. If `first` _is_ provided, `each` will only be use to check all values after the first.
 *
 * ### Handling TimeoutErrors
 *
 * If no `with` property was provided, subscriptions to the resulting observable may emit an error of {@link TimeoutError}.
 * The timeout error provides useful information you can examine when you're handling the error. The most common way to handle
 * the error would be with {@link catchError}, although you could use {@link tap} or just the error handler in your `subscribe` call
 * directly, if your error handling is only a side effect (such as notifying the user, or logging).
 *
 * In this case, you would check the error for `instanceof TimeoutError` to validate that the error was indeed from `timeout`, and
 * not from some other source. If it's not from `timeout`, you should probably rethrow it if you're in a `catchError`.
 *
 * ## Examples
 *
 * Emit a {@link TimeoutError} if the first value, and _only_ the first value, does not arrive within 5 seconds
 *
 * ```ts
 * import { interval, timeout } from 'rxjs';
 *
 * // A random interval that lasts between 0 and 10 seconds per tick
 * const source$ = interval(Math.round(Math.random() * 10_000));
 *
 * source$.pipe(
 *   timeout({ first: 5_000 })
 * )
 * .subscribe({
 *   next: console.log,
 *   error: console.error
 * });
 * ```
 *
 * Emit a {@link TimeoutError} if the source waits longer than 5 seconds between any two values or the first value
 * and subscription.
 *
 * ```ts
 * import { timer, timeout, expand } from 'rxjs';
 *
 * const getRandomTime = () => Math.round(Math.random() * 10_000);
 *
 * // An observable that waits a random amount of time between each delivered value
 * const source$ = timer(getRandomTime())
 *   .pipe(expand(() => timer(getRandomTime())));
 *
 * source$
 *   .pipe(timeout({ each: 5_000 }))
 *   .subscribe({
 *     next: console.log,
 *     error: console.error
 *   });
 * ```
 *
 * Emit a {@link TimeoutError} if the source does not emit before 7 seconds, _or_ if the source waits longer than
 * 5 seconds between any two values after the first.
 *
 * ```ts
 * import { timer, timeout, expand } from 'rxjs';
 *
 * const getRandomTime = () => Math.round(Math.random() * 10_000);
 *
 * // An observable that waits a random amount of time between each delivered value
 * const source$ = timer(getRandomTime())
 *   .pipe(expand(() => timer(getRandomTime())));
 *
 * source$
 *   .pipe(timeout({ first: 7_000, each: 5_000 }))
 *   .subscribe({
 *     next: console.log,
 *     error: console.error
 *   });
 * ```
 */
export declare function timeout<T, M = unknown>(config: Omit<TimeoutConfig<T, any, M>, 'with'>): OperatorFunction<T, T>;
/**
 * Returns an observable that will error if the source does not push its first value before the specified time passed as a `Date`.
 * This is functionally the same as `timeout({ first: someDate })`.
 *
 * <span class="informal">Errors if the first value doesn't show up before the given date and time</span>
 *
 * ![](timeout.png)
 *
 * @param first The date to at which the resulting observable will timeout if the source observable
 * does not emit at least one value.
 * @param scheduler The scheduler to use. Defaults to {@link asyncScheduler}.
 */
export declare function timeout<T>(first: Date, scheduler?: SchedulerLike): MonoTypeOperatorFunction<T>;
/**
 * Returns an observable that will error if the source does not push a value within the specified time in milliseconds.
 * This is functionally the same as `timeout({ each: milliseconds })`.
 *
 * <span class="informal">Errors if it waits too long between any value</span>
 *
 * ![](timeout.png)
 *
 * @param each The time allowed between each pushed value from the source before the resulting observable
 * will timeout.
 * @param scheduler The scheduler to use. Defaults to {@link asyncScheduler}.
 */
export declare function timeout<T>(each: number, scheduler?: SchedulerLike): MonoTypeOperatorFunction<T>;
//# sourceMappingURL=timeout.d.ts.map