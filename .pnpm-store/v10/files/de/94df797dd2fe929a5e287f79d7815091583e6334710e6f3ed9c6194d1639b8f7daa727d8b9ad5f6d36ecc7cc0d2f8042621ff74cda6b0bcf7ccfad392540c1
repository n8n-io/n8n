import { Observable } from '../Observable';
import { innerFrom } from '../observable/innerFrom';
import { Subject } from '../Subject';
import { Subscription } from '../Subscription';

import { MonoTypeOperatorFunction, ObservableInput } from '../types';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';

/**
 * Returns an Observable that mirrors the source Observable with the exception of a `complete`. If the source
 * Observable calls `complete`, this method will emit to the Observable returned from `notifier`. If that Observable
 * calls `complete` or `error`, then this method will call `complete` or `error` on the child subscription. Otherwise
 * this method will resubscribe to the source Observable.
 *
 * ![](repeatWhen.png)
 *
 * ## Example
 *
 * Repeat a message stream on click
 *
 * ```ts
 * import { of, fromEvent, repeatWhen } from 'rxjs';
 *
 * const source = of('Repeat message');
 * const documentClick$ = fromEvent(document, 'click');
 *
 * const result = source.pipe(repeatWhen(() => documentClick$));
 *
 * result.subscribe(data => console.log(data))
 * ```
 *
 * @see {@link repeat}
 * @see {@link retry}
 * @see {@link retryWhen}
 *
 * @param notifier Function that receives an Observable of notifications with
 * which a user can `complete` or `error`, aborting the repetition.
 * @return A function that returns an Observable that mirrors the source
 * Observable with the exception of a `complete`.
 * @deprecated Will be removed in v9 or v10. Use {@link repeat}'s {@link RepeatConfig#delay delay} option instead.
 * Instead of `repeatWhen(() => notify$)`, use: `repeat({ delay: () => notify$ })`.
 */
export function repeatWhen<T>(notifier: (notifications: Observable<void>) => ObservableInput<any>): MonoTypeOperatorFunction<T> {
  return operate((source, subscriber) => {
    let innerSub: Subscription | null;
    let syncResub = false;
    let completions$: Subject<void>;
    let isNotifierComplete = false;
    let isMainComplete = false;

    /**
     * Checks to see if we can complete the result, completes it, and returns `true` if it was completed.
     */
    const checkComplete = () => isMainComplete && isNotifierComplete && (subscriber.complete(), true);
    /**
     * Gets the subject to send errors through. If it doesn't exist,
     * we know we need to setup the notifier.
     */
    const getCompletionSubject = () => {
      if (!completions$) {
        completions$ = new Subject();

        // If the call to `notifier` throws, it will be caught by the OperatorSubscriber
        // In the main subscription -- in `subscribeForRepeatWhen`.
        innerFrom(notifier(completions$)).subscribe(
          createOperatorSubscriber(
            subscriber,
            () => {
              if (innerSub) {
                subscribeForRepeatWhen();
              } else {
                // If we don't have an innerSub yet, that's because the inner subscription
                // call hasn't even returned yet. We've arrived here synchronously.
                // So we flag that we want to resub, such that we can ensure finalization
                // happens before we resubscribe.
                syncResub = true;
              }
            },
            () => {
              isNotifierComplete = true;
              checkComplete();
            }
          )
        );
      }
      return completions$;
    };

    const subscribeForRepeatWhen = () => {
      isMainComplete = false;

      innerSub = source.subscribe(
        createOperatorSubscriber(subscriber, undefined, () => {
          isMainComplete = true;
          // Check to see if we are complete, and complete if so.
          // If we are not complete. Get the subject. This calls the `notifier` function.
          // If that function fails, it will throw and `.next()` will not be reached on this
          // line. The thrown error is caught by the _complete handler in this
          // `OperatorSubscriber` and handled appropriately.
          !checkComplete() && getCompletionSubject().next();
        })
      );

      if (syncResub) {
        // Ensure that the inner subscription is torn down before
        // moving on to the next subscription in the synchronous case.
        // If we don't do this here, all inner subscriptions will not be
        // torn down until the entire observable is done.
        innerSub.unsubscribe();
        // It is important to null this out. Not only to free up memory, but
        // to make sure code above knows we are in a subscribing state to
        // handle synchronous resubscription.
        innerSub = null;
        // We may need to do this multiple times, so reset the flags.
        syncResub = false;
        // Resubscribe
        subscribeForRepeatWhen();
      }
    };

    // Start the subscription
    subscribeForRepeatWhen();
  });
}
