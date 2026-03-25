import { MonoTypeOperatorFunction, Observer } from '../types';
import { isFunction } from '../util/isFunction';
import { operate } from '../util/lift';
import { createOperatorSubscriber } from './OperatorSubscriber';
import { identity } from '../util/identity';

/**
 * An extension to the {@link Observer} interface used only by the {@link tap} operator.
 *
 * It provides a useful set of callbacks a user can register to do side-effects in
 * cases other than what the usual {@link Observer} callbacks are
 * ({@link guide/glossary-and-semantics#next next},
 * {@link guide/glossary-and-semantics#error error} and/or
 * {@link guide/glossary-and-semantics#complete complete}).
 *
 * ## Example
 *
 * ```ts
 * import { fromEvent, switchMap, tap, interval, take } from 'rxjs';
 *
 * const source$ = fromEvent(document, 'click');
 * const result$ = source$.pipe(
 *   switchMap((_, i) => i % 2 === 0
 *     ? fromEvent(document, 'mousemove').pipe(
 *         tap({
 *           subscribe: () => console.log('Subscribed to the mouse move events after click #' + i),
 *           unsubscribe: () => console.log('Mouse move events #' + i + ' unsubscribed'),
 *           finalize: () => console.log('Mouse move events #' + i + ' finalized')
 *         })
 *       )
 *     : interval(1_000).pipe(
 *         take(5),
 *         tap({
 *           subscribe: () => console.log('Subscribed to the 1-second interval events after click #' + i),
 *           unsubscribe: () => console.log('1-second interval events #' + i + ' unsubscribed'),
 *           finalize: () => console.log('1-second interval events #' + i + ' finalized')
 *         })
 *       )
 *   )
 * );
 *
 * const subscription = result$.subscribe({
 *   next: console.log
 * });
 *
 * setTimeout(() => {
 *   console.log('Unsubscribe after 60 seconds');
 *   subscription.unsubscribe();
 * }, 60_000);
 * ```
 */
export interface TapObserver<T> extends Observer<T> {
  /**
   * The callback that `tap` operator invokes at the moment when the source Observable
   * gets subscribed to.
   */
  subscribe: () => void;
  /**
   * The callback that `tap` operator invokes when an explicit
   * {@link guide/glossary-and-semantics#unsubscription unsubscribe} happens. It won't get invoked on
   * `error` or `complete` events.
   */
  unsubscribe: () => void;
  /**
   * The callback that `tap` operator invokes when any kind of
   * {@link guide/glossary-and-semantics#finalization finalization} happens - either when
   * the source Observable `error`s or `complete`s or when it gets explicitly unsubscribed
   * by the user. There is no difference in using this callback or the {@link finalize}
   * operator, but if you're already using `tap` operator, you can use this callback
   * instead. You'd get the same result in either case.
   */
  finalize: () => void;
}
export function tap<T>(observerOrNext?: Partial<TapObserver<T>> | ((value: T) => void)): MonoTypeOperatorFunction<T>;
/** @deprecated Instead of passing separate callback arguments, use an observer argument. Signatures taking separate callback arguments will be removed in v8. Details: https://rxjs.dev/deprecations/subscribe-arguments */
export function tap<T>(
  next?: ((value: T) => void) | null,
  error?: ((error: any) => void) | null,
  complete?: (() => void) | null
): MonoTypeOperatorFunction<T>;

/**
 * Used to perform side-effects for notifications from the source observable
 *
 * <span class="informal">Used when you want to affect outside state with a notification without altering the notification</span>
 *
 * ![](tap.png)
 *
 * Tap is designed to allow the developer a designated place to perform side effects. While you _could_ perform side-effects
 * inside of a `map` or a `mergeMap`, that would make their mapping functions impure, which isn't always a big deal, but will
 * make it so you can't do things like memoize those functions. The `tap` operator is designed solely for such side-effects to
 * help you remove side-effects from other operations.
 *
 * For any notification, next, error, or complete, `tap` will call the appropriate callback you have provided to it, via a function
 * reference, or a partial observer, then pass that notification down the stream.
 *
 * The observable returned by `tap` is an exact mirror of the source, with one exception: Any error that occurs -- synchronously -- in a handler
 * provided to `tap` will be emitted as an error from the returned observable.
 *
 * > Be careful! You can mutate objects as they pass through the `tap` operator's handlers.
 *
 * The most common use of `tap` is actually for debugging. You can place a `tap(console.log)` anywhere
 * in your observable `pipe`, log out the notifications as they are emitted by the source returned by the previous
 * operation.
 *
 * ## Examples
 *
 * Check a random number before it is handled. Below is an observable that will use a random number between 0 and 1,
 * and emit `'big'` or `'small'` depending on the size of that number. But we wanted to log what the original number
 * was, so we have added a `tap(console.log)`.
 *
 * ```ts
 * import { of, tap, map } from 'rxjs';
 *
 * of(Math.random()).pipe(
 *   tap(console.log),
 *   map(n => n > 0.5 ? 'big' : 'small')
 * ).subscribe(console.log);
 * ```
 *
 * Using `tap` to analyze a value and force an error. Below is an observable where in our system we only
 * want to emit numbers 3 or less we get from another source. We can force our observable to error
 * using `tap`.
 *
 * ```ts
 * import { of, tap } from 'rxjs';
 *
 * const source = of(1, 2, 3, 4, 5);
 *
 * source.pipe(
 *   tap(n => {
 *     if (n > 3) {
 *       throw new TypeError(`Value ${ n } is greater than 3`);
 *     }
 *   })
 * )
 * .subscribe({ next: console.log, error: err => console.log(err.message) });
 * ```
 *
 * We want to know when an observable completes before moving on to the next observable. The system
 * below will emit a random series of `'X'` characters from 3 different observables in sequence. The
 * only way we know when one observable completes and moves to the next one, in this case, is because
 * we have added a `tap` with the side effect of logging to console.
 *
 * ```ts
 * import { of, concatMap, interval, take, map, tap } from 'rxjs';
 *
 * of(1, 2, 3).pipe(
 *   concatMap(n => interval(1000).pipe(
 *     take(Math.round(Math.random() * 10)),
 *     map(() => 'X'),
 *     tap({ complete: () => console.log(`Done with ${ n }`) })
 *   ))
 * )
 * .subscribe(console.log);
 * ```
 *
 * @see {@link finalize}
 * @see {@link TapObserver}
 *
 * @param observerOrNext A next handler or partial observer
 * @param error An error handler
 * @param complete A completion handler
 * @return A function that returns an Observable identical to the source, but
 * runs the specified Observer or callback(s) for each item.
 */
export function tap<T>(
  observerOrNext?: Partial<TapObserver<T>> | ((value: T) => void) | null,
  error?: ((e: any) => void) | null,
  complete?: (() => void) | null
): MonoTypeOperatorFunction<T> {
  // We have to check to see not only if next is a function,
  // but if error or complete were passed. This is because someone
  // could technically call tap like `tap(null, fn)` or `tap(null, null, fn)`.
  const tapObserver =
    isFunction(observerOrNext) || error || complete
      ? // tslint:disable-next-line: no-object-literal-type-assertion
        ({ next: observerOrNext as Exclude<typeof observerOrNext, Partial<TapObserver<T>>>, error, complete } as Partial<TapObserver<T>>)
      : observerOrNext;

  return tapObserver
    ? operate((source, subscriber) => {
        tapObserver.subscribe?.();
        let isUnsub = true;
        source.subscribe(
          createOperatorSubscriber(
            subscriber,
            (value) => {
              tapObserver.next?.(value);
              subscriber.next(value);
            },
            () => {
              isUnsub = false;
              tapObserver.complete?.();
              subscriber.complete();
            },
            (err) => {
              isUnsub = false;
              tapObserver.error?.(err);
              subscriber.error(err);
            },
            () => {
              if (isUnsub) {
                tapObserver.unsubscribe?.();
              }
              tapObserver.finalize?.();
            }
          )
        );
      })
    : // Tap was called with no valid tap observer or handler
      // (e.g. `tap(null, null, null)` or `tap(null)` or `tap()`)
      // so we're going to just mirror the source.
      identity;
}
