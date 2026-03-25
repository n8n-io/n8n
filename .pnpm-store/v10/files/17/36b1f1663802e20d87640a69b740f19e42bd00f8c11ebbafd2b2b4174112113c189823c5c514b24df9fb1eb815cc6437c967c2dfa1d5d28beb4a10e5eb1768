import { Observable } from '../Observable';
import { SchedulerLike } from '../types';
/**
 * Creates an observable that will create an error instance and push it to the consumer as an error
 * immediately upon subscription.
 *
 * <span class="informal">Just errors and does nothing else</span>
 *
 * ![](throw.png)
 *
 * This creation function is useful for creating an observable that will create an error and error every
 * time it is subscribed to. Generally, inside of most operators when you might want to return an errored
 * observable, this is unnecessary. In most cases, such as in the inner return of {@link concatMap},
 * {@link mergeMap}, {@link defer}, and many others, you can simply throw the error, and RxJS will pick
 * that up and notify the consumer of the error.
 *
 * ## Example
 *
 * Create a simple observable that will create a new error with a timestamp and log it
 * and the message every time you subscribe to it
 *
 * ```ts
 * import { throwError } from 'rxjs';
 *
 * let errorCount = 0;
 *
 * const errorWithTimestamp$ = throwError(() => {
 *   const error: any = new Error(`This is error number ${ ++errorCount }`);
 *   error.timestamp = Date.now();
 *   return error;
 * });
 *
 * errorWithTimestamp$.subscribe({
 *   error: err => console.log(err.timestamp, err.message)
 * });
 *
 * errorWithTimestamp$.subscribe({
 *   error: err => console.log(err.timestamp, err.message)
 * });
 *
 * // Logs the timestamp and a new error message for each subscription
 * ```
 *
 * ### Unnecessary usage
 *
 * Using `throwError` inside of an operator or creation function
 * with a callback, is usually not necessary
 *
 * ```ts
 * import { of, concatMap, timer, throwError } from 'rxjs';
 *
 * const delays$ = of(1000, 2000, Infinity, 3000);
 *
 * delays$.pipe(
 *   concatMap(ms => {
 *     if (ms < 10000) {
 *       return timer(ms);
 *     } else {
 *       // This is probably overkill.
 *       return throwError(() => new Error(`Invalid time ${ ms }`));
 *     }
 *   })
 * )
 * .subscribe({
 *   next: console.log,
 *   error: console.error
 * });
 * ```
 *
 * You can just throw the error instead
 *
 * ```ts
 * import { of, concatMap, timer } from 'rxjs';
 *
 * const delays$ = of(1000, 2000, Infinity, 3000);
 *
 * delays$.pipe(
 *   concatMap(ms => {
 *     if (ms < 10000) {
 *       return timer(ms);
 *     } else {
 *       // Cleaner and easier to read for most folks.
 *       throw new Error(`Invalid time ${ ms }`);
 *     }
 *   })
 * )
 * .subscribe({
 *   next: console.log,
 *   error: console.error
 * });
 * ```
 *
 * @param errorFactory A factory function that will create the error instance that is pushed.
 */
export declare function throwError(errorFactory: () => any): Observable<never>;
/**
 * Returns an observable that will error with the specified error immediately upon subscription.
 *
 * @param error The error instance to emit
 * @deprecated Support for passing an error value will be removed in v8. Instead, pass a factory function to `throwError(() => new Error('test'))`. This is
 * because it will create the error at the moment it should be created and capture a more appropriate stack trace. If
 * for some reason you need to create the error ahead of time, you can still do that: `const err = new Error('test'); throwError(() => err);`.
 */
export declare function throwError(error: any): Observable<never>;
/**
 * Notifies the consumer of an error using a given scheduler by scheduling it at delay `0` upon subscription.
 *
 * @param errorOrErrorFactory An error instance or error factory
 * @param scheduler A scheduler to use to schedule the error notification
 * @deprecated The `scheduler` parameter will be removed in v8.
 * Use `throwError` in combination with {@link observeOn}: `throwError(() => new Error('test')).pipe(observeOn(scheduler));`.
 * Details: https://rxjs.dev/deprecations/scheduler-argument
 */
export declare function throwError(errorOrErrorFactory: any, scheduler: SchedulerLike): Observable<never>;
//# sourceMappingURL=throwError.d.ts.map