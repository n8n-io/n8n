import { OperatorFunction } from '../types';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';

/**
 * Groups pairs of consecutive emissions together and emits them as an array of
 * two values.
 *
 * <span class="informal">Puts the current value and previous value together as
 * an array, and emits that.</span>
 *
 * ![](pairwise.png)
 *
 * The Nth emission from the source Observable will cause the output Observable
 * to emit an array [(N-1)th, Nth] of the previous and the current value, as a
 * pair. For this reason, `pairwise` emits on the second and subsequent
 * emissions from the source Observable, but not on the first emission, because
 * there is no previous value in that case.
 *
 * ## Example
 *
 * On every click (starting from the second), emit the relative distance to the previous click
 *
 * ```ts
 * import { fromEvent, pairwise, map } from 'rxjs';
 *
 * const clicks = fromEvent<PointerEvent>(document, 'click');
 * const pairs = clicks.pipe(pairwise());
 * const distance = pairs.pipe(
 *   map(([first, second]) => {
 *     const x0 = first.clientX;
 *     const y0 = first.clientY;
 *     const x1 = second.clientX;
 *     const y1 = second.clientY;
 *     return Math.sqrt(Math.pow(x0 - x1, 2) + Math.pow(y0 - y1, 2));
 *   })
 * );
 *
 * distance.subscribe(x => console.log(x));
 * ```
 *
 * @see {@link buffer}
 * @see {@link bufferCount}
 *
 * @return A function that returns an Observable of pairs (as arrays) of
 * consecutive values from the source Observable.
 */
export function pairwise<T>(): OperatorFunction<T, [T, T]> {
  return operate((source, subscriber) => {
    let prev: T;
    let hasPrev = false;
    source.subscribe(
      createOperatorSubscriber(subscriber, (value) => {
        const p = prev;
        prev = value;
        hasPrev && subscriber.next([p, value]);
        hasPrev = true;
      })
    );
  });
}
