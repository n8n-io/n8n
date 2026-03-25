import { MonoTypeOperatorFunction, ObservableInput } from '../types';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { innerFrom } from '../observable/innerFrom';
import { noop } from '../util/noop';

/**
 * Returns an Observable that skips items emitted by the source Observable until a second Observable emits an item.
 *
 * The `skipUntil` operator causes the observable stream to skip the emission of values until the passed in observable
 * emits the first value. This can be particularly useful in combination with user interactions, responses of HTTP
 * requests or waiting for specific times to pass by.
 *
 * ![](skipUntil.png)
 *
 * Internally, the `skipUntil` operator subscribes to the passed in `notifier` `ObservableInput` (which gets converted
 * to an Observable) in order to recognize the emission of its first value. When `notifier` emits next, the operator
 * unsubscribes from it and starts emitting the values of the *source* observable until it completes or errors. It
 * will never let the *source* observable emit any values if the `notifier` completes or throws an error without
 * emitting a value before.
 *
 * ## Example
 *
 * In the following example, all emitted values of the interval observable are skipped until the user clicks anywhere
 * within the page
 *
 * ```ts
 * import { interval, fromEvent, skipUntil } from 'rxjs';
 *
 * const intervalObservable = interval(1000);
 * const click = fromEvent(document, 'click');
 *
 * const emitAfterClick = intervalObservable.pipe(
 *   skipUntil(click)
 * );
 * // clicked at 4.6s. output: 5...6...7...8........ or
 * // clicked at 7.3s. output: 8...9...10..11.......
 * emitAfterClick.subscribe(value => console.log(value));
 * ```
 *
 * @see {@link last}
 * @see {@link skip}
 * @see {@link skipWhile}
 * @see {@link skipLast}
 *
 * @param notifier An `ObservableInput` that has to emit an item before the source Observable elements begin to
 * be mirrored by the resulting Observable.
 * @return A function that returns an Observable that skips items from the
 * source Observable until the `notifier` Observable emits an item, then emits the
 * remaining items.
 */
export function skipUntil<T>(notifier: ObservableInput<any>): MonoTypeOperatorFunction<T> {
  return operate((source, subscriber) => {
    let taking = false;

    const skipSubscriber = createOperatorSubscriber(
      subscriber,
      () => {
        skipSubscriber?.unsubscribe();
        taking = true;
      },
      noop
    );

    innerFrom(notifier).subscribe(skipSubscriber);

    source.subscribe(createOperatorSubscriber(subscriber, (value) => taking && subscriber.next(value)));
  });
}
