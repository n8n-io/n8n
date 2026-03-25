import { Observable } from '../Observable';

import { ObservableInput, OperatorFunction, ObservedValueOf } from '../types';
import { Subscription } from '../Subscription';
import { innerFrom } from '../observable/innerFrom';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { operate } from '../util/lift';

/* tslint:disable:max-line-length */
export function catchError<T, O extends ObservableInput<any>>(
  selector: (err: any, caught: Observable<T>) => O
): OperatorFunction<T, T | ObservedValueOf<O>>;
/* tslint:enable:max-line-length */

/**
 * Catches errors on the observable to be handled by returning a new observable or throwing an error.
 *
 * <span class="informal">
 * It only listens to the error channel and ignores notifications.
 * Handles errors from the source observable, and maps them to a new observable.
 * The error may also be rethrown, or a new error can be thrown to emit an error from the result.
 * </span>
 *
 * ![](catch.png)
 *
 * This operator handles errors, but forwards along all other events to the resulting observable.
 * If the source observable terminates with an error, it will map that error to a new observable,
 * subscribe to it, and forward all of its events to the resulting observable.
 *
 * ## Examples
 *
 * Continue with a different Observable when there's an error
 *
 * ```ts
 * import { of, map, catchError } from 'rxjs';
 *
 * of(1, 2, 3, 4, 5)
 *   .pipe(
 *     map(n => {
 *       if (n === 4) {
 *         throw 'four!';
 *       }
 *       return n;
 *     }),
 *     catchError(err => of('I', 'II', 'III', 'IV', 'V'))
 *   )
 *   .subscribe(x => console.log(x));
 *   // 1, 2, 3, I, II, III, IV, V
 * ```
 *
 * Retry the caught source Observable again in case of error, similar to `retry()` operator
 *
 * ```ts
 * import { of, map, catchError, take } from 'rxjs';
 *
 * of(1, 2, 3, 4, 5)
 *   .pipe(
 *     map(n => {
 *       if (n === 4) {
 *         throw 'four!';
 *       }
 *       return n;
 *     }),
 *     catchError((err, caught) => caught),
 *     take(30)
 *   )
 *   .subscribe(x => console.log(x));
 *   // 1, 2, 3, 1, 2, 3, ...
 * ```
 *
 * Throw a new error when the source Observable throws an error
 *
 * ```ts
 * import { of, map, catchError } from 'rxjs';
 *
 * of(1, 2, 3, 4, 5)
 *   .pipe(
 *     map(n => {
 *       if (n === 4) {
 *         throw 'four!';
 *       }
 *       return n;
 *     }),
 *     catchError(err => {
 *       throw 'error in source. Details: ' + err;
 *     })
 *   )
 *   .subscribe({
 *     next: x => console.log(x),
 *     error: err => console.log(err)
 *   });
 *   // 1, 2, 3, error in source. Details: four!
 * ```
 *
 * @see {@link onErrorResumeNext}
 * @see {@link repeat}
 * @see {@link repeatWhen}
 * @see {@link retry }
 * @see {@link retryWhen}
 *
 * @param {function} selector a function that takes as arguments `err`, which is the error, and `caught`, which
 * is the source observable, in case you'd like to "retry" that observable by returning it again. Whatever observable
 * is returned by the `selector` will be used to continue the observable chain.
 * @return A function that returns an Observable that originates from either
 * the source or the Observable returned by the `selector` function.
 */
export function catchError<T, O extends ObservableInput<any>>(
  selector: (err: any, caught: Observable<T>) => O
): OperatorFunction<T, T | ObservedValueOf<O>> {
  return operate((source, subscriber) => {
    let innerSub: Subscription | null = null;
    let syncUnsub = false;
    let handledResult: Observable<ObservedValueOf<O>>;

    innerSub = source.subscribe(
      createOperatorSubscriber(subscriber, undefined, undefined, (err) => {
        handledResult = innerFrom(selector(err, catchError(selector)(source)));
        if (innerSub) {
          innerSub.unsubscribe();
          innerSub = null;
          handledResult.subscribe(subscriber);
        } else {
          // We don't have an innerSub yet, that means the error was synchronous
          // because the subscribe call hasn't returned yet.
          syncUnsub = true;
        }
      })
    );

    if (syncUnsub) {
      // We have a synchronous error, we need to make sure to
      // finalize right away. This ensures that callbacks in the `finalize` operator are called
      // at the right time, and that finalization occurs at the expected
      // time between the source error and the subscription to the
      // next observable.
      innerSub.unsubscribe();
      innerSub = null;
      handledResult!.subscribe(subscriber);
    }
  });
}
