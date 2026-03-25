import { OperatorFunction } from '../types';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { noop } from '../util/noop';

/**
 * Ignores all items emitted by the source Observable and only passes calls of `complete` or `error`.
 *
 * ![](ignoreElements.png)
 *
 * The `ignoreElements` operator suppresses all items emitted by the source Observable,
 * but allows its termination notification (either `error` or `complete`) to pass through unchanged.
 *
 * If you do not care about the items being emitted by an Observable, but you do want to be notified
 * when it completes or when it terminates with an error, you can apply the `ignoreElements` operator
 * to the Observable, which will ensure that it will never call its observers’ `next` handlers.
 *
 * ## Example
 *
 * Ignore all `next` emissions from the source
 *
 * ```ts
 * import { of, ignoreElements } from 'rxjs';
 *
 * of('you', 'talking', 'to', 'me')
 *   .pipe(ignoreElements())
 *   .subscribe({
 *     next: word => console.log(word),
 *     error: err => console.log('error:', err),
 *     complete: () => console.log('the end'),
 *   });
 *
 * // result:
 * // 'the end'
 * ```
 *
 * @return A function that returns an empty Observable that only calls
 * `complete` or `error`, based on which one is called by the source
 * Observable.
 */
export function ignoreElements(): OperatorFunction<unknown, never> {
  return operate((source, subscriber) => {
    source.subscribe(createOperatorSubscriber(subscriber, noop));
  });
}
