import { MonoTypeOperatorFunction, ObservableInput } from '../types';
import { operate } from '../util/lift';
import { Subscription } from '../Subscription';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { identity } from '../util/identity';
import { timer } from '../observable/timer';
import { innerFrom } from '../observable/innerFrom';

/**
 * The {@link retry} operator configuration object. `retry` either accepts a `number`
 * or an object described by this interface.
 */
export interface RetryConfig {
  /**
   * The maximum number of times to retry. If `count` is omitted, `retry` will try to
   * resubscribe on errors infinite number of times.
   */
  count?: number;
  /**
   * The number of milliseconds to delay before retrying, OR a function to
   * return a notifier for delaying. If a function is given, that function should
   * return a notifier that, when it emits will retry the source. If the notifier
   * completes _without_ emitting, the resulting observable will complete without error,
   * if the notifier errors, the error will be pushed to the result.
   */
  delay?: number | ((error: any, retryCount: number) => ObservableInput<any>);
  /**
   * Whether or not to reset the retry counter when the retried subscription
   * emits its first value.
   */
  resetOnSuccess?: boolean;
}

export function retry<T>(count?: number): MonoTypeOperatorFunction<T>;
export function retry<T>(config: RetryConfig): MonoTypeOperatorFunction<T>;

/**
 * Returns an Observable that mirrors the source Observable with the exception of an `error`.
 *
 * If the source Observable calls `error`, this method will resubscribe to the source Observable for a maximum of
 * `count` resubscriptions rather than propagating the `error` call.
 *
 * ![](retry.png)
 *
 * The number of retries is determined by the `count` parameter. It can be set either by passing a number to
 * `retry` function or by setting `count` property when `retry` is configured using {@link RetryConfig}. If
 * `count` is omitted, `retry` will try to resubscribe on errors infinite number of times.
 *
 * Any and all items emitted by the source Observable will be emitted by the resulting Observable, even those
 * emitted during failed subscriptions. For example, if an Observable fails at first but emits `[1, 2]` then
 * succeeds the second time and emits: `[1, 2, 3, 4, 5, complete]` then the complete stream of emissions and
 * notifications would be: `[1, 2, 1, 2, 3, 4, 5, complete]`.
 *
 * ## Example
 *
 * ```ts
 * import { interval, mergeMap, throwError, of, retry } from 'rxjs';
 *
 * const source = interval(1000);
 * const result = source.pipe(
 *   mergeMap(val => val > 5 ? throwError(() => 'Error!') : of(val)),
 *   retry(2) // retry 2 times on error
 * );
 *
 * result.subscribe({
 *   next: value => console.log(value),
 *   error: err => console.log(`${ err }: Retried 2 times then quit!`)
 * });
 *
 * // Output:
 * // 0..1..2..3..4..5..
 * // 0..1..2..3..4..5..
 * // 0..1..2..3..4..5..
 * // 'Error!: Retried 2 times then quit!'
 * ```
 *
 * @see {@link retryWhen}
 *
 * @param configOrCount Either number of retry attempts before failing or a
 * {@link RetryConfig} object.
 * @return A function that returns an Observable that will resubscribe to the
 * source stream when the source stream errors, at most `count` times.
 */
export function retry<T>(configOrCount: number | RetryConfig = Infinity): MonoTypeOperatorFunction<T> {
  let config: RetryConfig;
  if (configOrCount && typeof configOrCount === 'object') {
    config = configOrCount;
  } else {
    config = {
      count: configOrCount as number,
    };
  }
  const { count = Infinity, delay, resetOnSuccess: resetOnSuccess = false } = config;

  return count <= 0
    ? identity
    : operate((source, subscriber) => {
        let soFar = 0;
        let innerSub: Subscription | null;
        const subscribeForRetry = () => {
          let syncUnsub = false;
          innerSub = source.subscribe(
            createOperatorSubscriber(
              subscriber,
              (value) => {
                // If we're resetting on success
                if (resetOnSuccess) {
                  soFar = 0;
                }
                subscriber.next(value);
              },
              // Completions are passed through to consumer.
              undefined,
              (err) => {
                if (soFar++ < count) {
                  // We are still under our retry count
                  const resub = () => {
                    if (innerSub) {
                      innerSub.unsubscribe();
                      innerSub = null;
                      subscribeForRetry();
                    } else {
                      syncUnsub = true;
                    }
                  };

                  if (delay != null) {
                    // The user specified a retry delay.
                    // They gave us a number, use a timer, otherwise, it's a function,
                    // and we're going to call it to get a notifier.
                    const notifier = typeof delay === 'number' ? timer(delay) : innerFrom(delay(err, soFar));
                    const notifierSubscriber = createOperatorSubscriber(
                      subscriber,
                      () => {
                        // After we get the first notification, we
                        // unsubscribe from the notifier, because we don't want anymore
                        // and we resubscribe to the source.
                        notifierSubscriber.unsubscribe();
                        resub();
                      },
                      () => {
                        // The notifier completed without emitting.
                        // The author is telling us they want to complete.
                        subscriber.complete();
                      }
                    );
                    notifier.subscribe(notifierSubscriber);
                  } else {
                    // There was no notifier given. Just resub immediately.
                    resub();
                  }
                } else {
                  // We're past our maximum number of retries.
                  // Just send along the error.
                  subscriber.error(err);
                }
              }
            )
          );
          if (syncUnsub) {
            innerSub.unsubscribe();
            innerSub = null;
            subscribeForRetry();
          }
        };
        subscribeForRetry();
      });
}
