import { Subscription } from '../Subscription';
import { EMPTY } from '../observable/empty';
import { operate } from '../util/lift';
import { MonoTypeOperatorFunction, ObservableInput } from '../types';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { innerFrom } from '../observable/innerFrom';
import { timer } from '../observable/timer';

export interface RepeatConfig {
  /**
   * The number of times to repeat the source. Defaults to `Infinity`.
   */
  count?: number;

  /**
   * If a `number`, will delay the repeat of the source by that number of milliseconds.
   * If a function, it will provide the number of times the source has been subscribed to,
   * and the return value should be a valid observable input that will notify when the source
   * should be repeated. If the notifier observable is empty, the result will complete.
   */
  delay?: number | ((count: number) => ObservableInput<any>);
}

/**
 * Returns an Observable that will resubscribe to the source stream when the source stream completes.
 *
 * <span class="informal">Repeats all values emitted on the source. It's like {@link retry}, but for non error cases.</span>
 *
 * ![](repeat.png)
 *
 * Repeat will output values from a source until the source completes, then it will resubscribe to the
 * source a specified number of times, with a specified delay. Repeat can be particularly useful in
 * combination with closing operators like {@link take}, {@link takeUntil}, {@link first}, or {@link takeWhile},
 * as it can be used to restart a source again from scratch.
 *
 * Repeat is very similar to {@link retry}, where {@link retry} will resubscribe to the source in the error case, but
 * `repeat` will resubscribe if the source completes.
 *
 * Note that `repeat` will _not_ catch errors. Use {@link retry} for that.
 *
 * - `repeat(0)` returns an empty observable
 * - `repeat()` will repeat forever
 * - `repeat({ delay: 200 })` will repeat forever, with a delay of 200ms between repetitions.
 * - `repeat({ count: 2, delay: 400 })` will repeat twice, with a delay of 400ms between repetitions.
 * - `repeat({ delay: (count) => timer(count * 1000) })` will repeat forever, but will have a delay that grows by one second for each repetition.
 *
 * ## Example
 *
 * Repeat a message stream
 *
 * ```ts
 * import { of, repeat } from 'rxjs';
 *
 * const source = of('Repeat message');
 * const result = source.pipe(repeat(3));
 *
 * result.subscribe(x => console.log(x));
 *
 * // Results
 * // 'Repeat message'
 * // 'Repeat message'
 * // 'Repeat message'
 * ```
 *
 * Repeat 3 values, 2 times
 *
 * ```ts
 * import { interval, take, repeat } from 'rxjs';
 *
 * const source = interval(1000);
 * const result = source.pipe(take(3), repeat(2));
 *
 * result.subscribe(x => console.log(x));
 *
 * // Results every second
 * // 0
 * // 1
 * // 2
 * // 0
 * // 1
 * // 2
 * ```
 *
 * Defining two complex repeats with delays on the same source.
 * Note that the second repeat cannot be called until the first
 * repeat as exhausted it's count.
 *
 * ```ts
 * import { defer, of, repeat } from 'rxjs';
 *
 * const source = defer(() => {
 *    return of(`Hello, it is ${new Date()}`)
 * });
 *
 * source.pipe(
 *    // Repeat 3 times with a delay of 1 second between repetitions
 *    repeat({
 *      count: 3,
 *      delay: 1000,
 *    }),
 *
 *    // *Then* repeat forever, but with an exponential step-back
 *    // maxing out at 1 minute.
 *    repeat({
 *      delay: (count) => timer(Math.min(60000, 2 ^ count * 1000))
 *    })
 * )
 * ```
 *
 * @see {@link repeatWhen}
 * @see {@link retry}
 *
 * @param count The number of times the source Observable items are repeated, a count of 0 will yield
 * an empty Observable.
 */
export function repeat<T>(countOrConfig?: number | RepeatConfig): MonoTypeOperatorFunction<T> {
  let count = Infinity;
  let delay: RepeatConfig['delay'];

  if (countOrConfig != null) {
    if (typeof countOrConfig === 'object') {
      ({ count = Infinity, delay } = countOrConfig);
    } else {
      count = countOrConfig;
    }
  }

  return count <= 0
    ? () => EMPTY
    : operate((source, subscriber) => {
        let soFar = 0;
        let sourceSub: Subscription | null;

        const resubscribe = () => {
          sourceSub?.unsubscribe();
          sourceSub = null;
          if (delay != null) {
            const notifier = typeof delay === 'number' ? timer(delay) : innerFrom(delay(soFar));
            const notifierSubscriber = createOperatorSubscriber(subscriber, () => {
              notifierSubscriber.unsubscribe();
              subscribeToSource();
            });
            notifier.subscribe(notifierSubscriber);
          } else {
            subscribeToSource();
          }
        };

        const subscribeToSource = () => {
          let syncUnsub = false;
          sourceSub = source.subscribe(
            createOperatorSubscriber(subscriber, undefined, () => {
              if (++soFar < count) {
                if (sourceSub) {
                  resubscribe();
                } else {
                  syncUnsub = true;
                }
              } else {
                subscriber.complete();
              }
            })
          );

          if (syncUnsub) {
            resubscribe();
          }
        };

        subscribeToSource();
      });
}
