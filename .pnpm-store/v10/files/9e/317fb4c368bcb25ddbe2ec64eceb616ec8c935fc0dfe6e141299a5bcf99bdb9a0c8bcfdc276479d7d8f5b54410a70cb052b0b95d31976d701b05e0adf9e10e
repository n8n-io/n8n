import { innerFrom } from '../observable/innerFrom';
import { Subject } from '../Subject';
import { SafeSubscriber } from '../Subscriber';
import { Subscription } from '../Subscription';
import { MonoTypeOperatorFunction, SubjectLike, ObservableInput } from '../types';
import { operate } from '../util/lift';

export interface ShareConfig<T> {
  /**
   * The factory used to create the subject that will connect the source observable to
   * multicast consumers.
   */
  connector?: () => SubjectLike<T>;
  /**
   * If `true`, the resulting observable will reset internal state on error from source and return to a "cold" state. This
   * allows the resulting observable to be "retried" in the event of an error.
   * If `false`, when an error comes from the source it will push the error into the connecting subject, and the subject
   * will remain the connecting subject, meaning the resulting observable will not go "cold" again, and subsequent retries
   * or resubscriptions will resubscribe to that same subject. In all cases, RxJS subjects will emit the same error again, however
   * {@link ReplaySubject} will also push its buffered values before pushing the error.
   * It is also possible to pass a notifier factory returning an `ObservableInput` instead which grants more fine-grained
   * control over how and when the reset should happen. This allows behaviors like conditional or delayed resets.
   */
  resetOnError?: boolean | ((error: any) => ObservableInput<any>);
  /**
   * If `true`, the resulting observable will reset internal state on completion from source and return to a "cold" state. This
   * allows the resulting observable to be "repeated" after it is done.
   * If `false`, when the source completes, it will push the completion through the connecting subject, and the subject
   * will remain the connecting subject, meaning the resulting observable will not go "cold" again, and subsequent repeats
   * or resubscriptions will resubscribe to that same subject.
   * It is also possible to pass a notifier factory returning an `ObservableInput` instead which grants more fine-grained
   * control over how and when the reset should happen. This allows behaviors like conditional or delayed resets.
   */
  resetOnComplete?: boolean | (() => ObservableInput<any>);
  /**
   * If `true`, when the number of subscribers to the resulting observable reaches zero due to those subscribers unsubscribing, the
   * internal state will be reset and the resulting observable will return to a "cold" state. This means that the next
   * time the resulting observable is subscribed to, a new subject will be created and the source will be subscribed to
   * again.
   * If `false`, when the number of subscribers to the resulting observable reaches zero due to unsubscription, the subject
   * will remain connected to the source, and new subscriptions to the result will be connected through that same subject.
   * It is also possible to pass a notifier factory returning an `ObservableInput` instead which grants more fine-grained
   * control over how and when the reset should happen. This allows behaviors like conditional or delayed resets.
   */
  resetOnRefCountZero?: boolean | (() => ObservableInput<any>);
}

export function share<T>(): MonoTypeOperatorFunction<T>;

export function share<T>(options: ShareConfig<T>): MonoTypeOperatorFunction<T>;

/**
 * Returns a new Observable that multicasts (shares) the original Observable. As long as there is at least one
 * Subscriber this Observable will be subscribed and emitting data. When all subscribers have unsubscribed it will
 * unsubscribe from the source Observable. Because the Observable is multicasting it makes the stream `hot`.
 * This is an alias for `multicast(() => new Subject()), refCount()`.
 *
 * The subscription to the underlying source Observable can be reset (unsubscribe and resubscribe for new subscribers),
 * if the subscriber count to the shared observable drops to 0, or if the source Observable errors or completes. It is
 * possible to use notifier factories for the resets to allow for behaviors like conditional or delayed resets. Please
 * note that resetting on error or complete of the source Observable does not behave like a transparent retry or restart
 * of the source because the error or complete will be forwarded to all subscribers and their subscription will be
 * closed. Only new subscribers after a reset on error or complete happened will cause a fresh subscription to the
 * source. To achieve transparent retries or restarts pipe the source through appropriate operators before sharing.
 *
 * ![](share.png)
 *
 * ## Example
 *
 * Generate new multicast Observable from the `source` Observable value
 *
 * ```ts
 * import { interval, tap, map, take, share } from 'rxjs';
 *
 * const source = interval(1000).pipe(
 *   tap(x => console.log('Processing: ', x)),
 *   map(x => x * x),
 *   take(6),
 *   share()
 * );
 *
 * source.subscribe(x => console.log('subscription 1: ', x));
 * source.subscribe(x => console.log('subscription 2: ', x));
 *
 * // Logs:
 * // Processing: 0
 * // subscription 1: 0
 * // subscription 2: 0
 * // Processing: 1
 * // subscription 1: 1
 * // subscription 2: 1
 * // Processing: 2
 * // subscription 1: 4
 * // subscription 2: 4
 * // Processing: 3
 * // subscription 1: 9
 * // subscription 2: 9
 * // Processing: 4
 * // subscription 1: 16
 * // subscription 2: 16
 * // Processing: 5
 * // subscription 1: 25
 * // subscription 2: 25
 * ```
 *
 * ## Example with notifier factory: Delayed reset
 *
 * ```ts
 * import { interval, take, share, timer } from 'rxjs';
 *
 * const source = interval(1000).pipe(
 *   take(3),
 *   share({
 *     resetOnRefCountZero: () => timer(1000)
 *   })
 * );
 *
 * const subscriptionOne = source.subscribe(x => console.log('subscription 1: ', x));
 * setTimeout(() => subscriptionOne.unsubscribe(), 1300);
 *
 * setTimeout(() => source.subscribe(x => console.log('subscription 2: ', x)), 1700);
 *
 * setTimeout(() => source.subscribe(x => console.log('subscription 3: ', x)), 5000);
 *
 * // Logs:
 * // subscription 1:  0
 * // (subscription 1 unsubscribes here)
 * // (subscription 2 subscribes here ~400ms later, source was not reset)
 * // subscription 2:  1
 * // subscription 2:  2
 * // (subscription 2 unsubscribes here)
 * // (subscription 3 subscribes here ~2000ms later, source did reset before)
 * // subscription 3:  0
 * // subscription 3:  1
 * // subscription 3:  2
 * ```
 *
 * @see {@link shareReplay}
 *
 * @return A function that returns an Observable that mirrors the source.
 */
export function share<T>(options: ShareConfig<T> = {}): MonoTypeOperatorFunction<T> {
  const { connector = () => new Subject<T>(), resetOnError = true, resetOnComplete = true, resetOnRefCountZero = true } = options;
  // It's necessary to use a wrapper here, as the _operator_ must be
  // referentially transparent. Otherwise, it cannot be used in calls to the
  // static `pipe` function - to create a partial pipeline.
  //
  // The _operator function_ - the function returned by the _operator_ - will
  // not be referentially transparent - as it shares its source - but the
  // _operator function_ is called when the complete pipeline is composed via a
  // call to a source observable's `pipe` method - not when the static `pipe`
  // function is called.
  return (wrapperSource) => {
    let connection: SafeSubscriber<T> | undefined;
    let resetConnection: Subscription | undefined;
    let subject: SubjectLike<T> | undefined;
    let refCount = 0;
    let hasCompleted = false;
    let hasErrored = false;

    const cancelReset = () => {
      resetConnection?.unsubscribe();
      resetConnection = undefined;
    };
    // Used to reset the internal state to a "cold"
    // state, as though it had never been subscribed to.
    const reset = () => {
      cancelReset();
      connection = subject = undefined;
      hasCompleted = hasErrored = false;
    };
    const resetAndUnsubscribe = () => {
      // We need to capture the connection before
      // we reset (if we need to reset).
      const conn = connection;
      reset();
      conn?.unsubscribe();
    };

    return operate<T, T>((source, subscriber) => {
      refCount++;
      if (!hasErrored && !hasCompleted) {
        cancelReset();
      }

      // Create the subject if we don't have one yet. Grab a local reference to
      // it as well, which avoids non-null assertions when using it and, if we
      // connect to it now, then error/complete need a reference after it was
      // reset.
      const dest = (subject = subject ?? connector());

      // Add the finalization directly to the subscriber - instead of returning it -
      // so that the handling of the subscriber's unsubscription will be wired
      // up _before_ the subscription to the source occurs. This is done so that
      // the assignment to the source connection's `closed` property will be seen
      // by synchronous firehose sources.
      subscriber.add(() => {
        refCount--;

        // If we're resetting on refCount === 0, and it's 0, we only want to do
        // that on "unsubscribe", really. Resetting on error or completion is a different
        // configuration.
        if (refCount === 0 && !hasErrored && !hasCompleted) {
          resetConnection = handleReset(resetAndUnsubscribe, resetOnRefCountZero);
        }
      });

      // The following line adds the subscription to the subscriber passed.
      // Basically, `subscriber === dest.subscribe(subscriber)` is `true`.
      dest.subscribe(subscriber);

      if (
        !connection &&
        // Check this shareReplay is still activate - it can be reset to 0
        // and be "unsubscribed" _before_ it actually subscribes.
        // If we were to subscribe then, it'd leak and get stuck.
        refCount > 0
      ) {
        // We need to create a subscriber here - rather than pass an observer and
        // assign the returned subscription to connection - because it's possible
        // for reentrant subscriptions to the shared observable to occur and in
        // those situations we want connection to be already-assigned so that we
        // don't create another connection to the source.
        connection = new SafeSubscriber({
          next: (value) => dest.next(value),
          error: (err) => {
            hasErrored = true;
            cancelReset();
            resetConnection = handleReset(reset, resetOnError, err);
            dest.error(err);
          },
          complete: () => {
            hasCompleted = true;
            cancelReset();
            resetConnection = handleReset(reset, resetOnComplete);
            dest.complete();
          },
        });
        innerFrom(source).subscribe(connection);
      }
    })(wrapperSource);
  };
}

function handleReset<T extends unknown[] = never[]>(
  reset: () => void,
  on: boolean | ((...args: T) => ObservableInput<any>),
  ...args: T
): Subscription | undefined {
  if (on === true) {
    reset();
    return;
  }

  if (on === false) {
    return;
  }

  const onSubscriber = new SafeSubscriber({
    next: () => {
      onSubscriber.unsubscribe();
      reset();
    },
  });

  return innerFrom(on(...args)).subscribe(onSubscriber);
}
