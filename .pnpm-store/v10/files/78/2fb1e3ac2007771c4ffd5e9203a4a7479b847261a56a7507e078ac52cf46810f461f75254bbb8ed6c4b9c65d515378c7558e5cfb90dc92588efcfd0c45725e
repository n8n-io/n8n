import { ObservableInputTuple, OperatorFunction } from '../types';
import { argsOrArgArray } from '../util/argsOrArgArray';
import { onErrorResumeNext as oERNCreate } from '../observable/onErrorResumeNext';

export function onErrorResumeNextWith<T, A extends readonly unknown[]>(
  sources: [...ObservableInputTuple<A>]
): OperatorFunction<T, T | A[number]>;
export function onErrorResumeNextWith<T, A extends readonly unknown[]>(
  ...sources: [...ObservableInputTuple<A>]
): OperatorFunction<T, T | A[number]>;

/**
 * When any of the provided Observable emits an complete or error notification, it immediately subscribes to the next one
 * that was passed.
 *
 * <span class="informal">Execute series of Observables, subscribes to next one on error or complete.</span>
 *
 * ![](onErrorResumeNext.png)
 *
 * `onErrorResumeNext` is an operator that accepts a series of Observables, provided either directly as
 * arguments or as an array. If no single Observable is provided, returned Observable will simply behave the same
 * as the source.
 *
 * `onErrorResumeNext` returns an Observable that starts by subscribing and re-emitting values from the source Observable.
 * When its stream of values ends - no matter if Observable completed or emitted an error - `onErrorResumeNext`
 * will subscribe to the first Observable that was passed as an argument to the method. It will start re-emitting
 * its values as well and - again - when that stream ends, `onErrorResumeNext` will proceed to subscribing yet another
 * Observable in provided series, no matter if previous Observable completed or ended with an error. This will
 * be happening until there is no more Observables left in the series, at which point returned Observable will
 * complete - even if the last subscribed stream ended with an error.
 *
 * `onErrorResumeNext` can be therefore thought of as version of {@link concat} operator, which is more permissive
 * when it comes to the errors emitted by its input Observables. While `concat` subscribes to the next Observable
 * in series only if previous one successfully completed, `onErrorResumeNext` subscribes even if it ended with
 * an error.
 *
 * Note that you do not get any access to errors emitted by the Observables. In particular do not
 * expect these errors to appear in error callback passed to {@link Observable#subscribe}. If you want to take
 * specific actions based on what error was emitted by an Observable, you should try out {@link catchError} instead.
 *
 *
 * ## Example
 *
 * Subscribe to the next Observable after map fails
 *
 * ```ts
 * import { of, onErrorResumeNext, map } from 'rxjs';
 *
 * of(1, 2, 3, 0)
 *   .pipe(
 *     map(x => {
 *       if (x === 0) {
 *         throw Error();
 *       }
 *
 *       return 10 / x;
 *     }),
 *     onErrorResumeNext(of(1, 2, 3))
 *   )
 *   .subscribe({
 *     next: val => console.log(val),
 *     error: err => console.log(err),          // Will never be called.
 *     complete: () => console.log('that\'s it!')
 *   });
 *
 * // Logs:
 * // 10
 * // 5
 * // 3.3333333333333335
 * // 1
 * // 2
 * // 3
 * // 'that's it!'
 * ```
 *
 * @see {@link concat}
 * @see {@link catchError}
 *
 * @param {...ObservableInput} sources Observables passed either directly or as an array.
 * @return A function that returns an Observable that emits values from source
 * Observable, but - if it errors - subscribes to the next passed Observable
 * and so on, until it completes or runs out of Observables.
 */
export function onErrorResumeNextWith<T, A extends readonly unknown[]>(
  ...sources: [[...ObservableInputTuple<A>]] | [...ObservableInputTuple<A>]
): OperatorFunction<T, T | A[number]> {
  // For some reason, TS 4.1 RC gets the inference wrong here and infers the
  // result to be `A[number][]` - completely dropping the ObservableInput part
  // of the type. This makes no sense whatsoever. As a workaround, the type is
  // asserted explicitly.
  const nextSources = argsOrArgArray(sources) as unknown as ObservableInputTuple<A>;

  return (source) => oERNCreate(source, ...nextSources);
}

/**
 * @deprecated Renamed. Use {@link onErrorResumeNextWith} instead. Will be removed in v8.
 */
export const onErrorResumeNext = onErrorResumeNextWith;
