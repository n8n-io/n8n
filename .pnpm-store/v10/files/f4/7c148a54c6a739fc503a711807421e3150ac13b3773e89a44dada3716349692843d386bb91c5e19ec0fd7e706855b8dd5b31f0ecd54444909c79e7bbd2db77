import { OperatorFunction, ObservableInput, ObservedValueOf, SubjectLike } from '../types';
import { Observable } from '../Observable';
import { Subject } from '../Subject';
import { innerFrom } from '../observable/innerFrom';
import { operate } from '../util/lift';
import { fromSubscribable } from '../observable/fromSubscribable';

/**
 * An object used to configure {@link connect} operator.
 */
export interface ConnectConfig<T> {
  /**
   * A factory function used to create the Subject through which the source
   * is multicast. By default, this creates a {@link Subject}.
   */
  connector: () => SubjectLike<T>;
}

/**
 * The default configuration for `connect`.
 */
const DEFAULT_CONFIG: ConnectConfig<unknown> = {
  connector: () => new Subject<unknown>(),
};

/**
 * Creates an observable by multicasting the source within a function that
 * allows the developer to define the usage of the multicast prior to connection.
 *
 * This is particularly useful if the observable source you wish to multicast could
 * be synchronous or asynchronous. This sets it apart from {@link share}, which, in the
 * case of totally synchronous sources will fail to share a single subscription with
 * multiple consumers, as by the time the subscription to the result of {@link share}
 * has returned, if the source is synchronous its internal reference count will jump from
 * 0 to 1 back to 0 and reset.
 *
 * To use `connect`, you provide a `selector` function that will give you
 * a multicast observable that is not yet connected. You then use that multicast observable
 * to create a resulting observable that, when subscribed, will set up your multicast. This is
 * generally, but not always, accomplished with {@link merge}.
 *
 * Note that using a {@link takeUntil} inside of `connect`'s `selector` _might_ mean you were looking
 * to use the {@link takeWhile} operator instead.
 *
 * When you subscribe to the result of `connect`, the `selector` function will be called. After
 * the `selector` function returns, the observable it returns will be subscribed to, _then_ the
 * multicast will be connected to the source.
 *
 * ## Example
 *
 * Sharing a totally synchronous observable
 *
 * ```ts
 * import { of, tap, connect, merge, map, filter } from 'rxjs';
 *
 * const source$ = of(1, 2, 3, 4, 5).pipe(
 *   tap({
 *     subscribe: () => console.log('subscription started'),
 *     next: n => console.log(`source emitted ${ n }`)
 *   })
 * );
 *
 * source$.pipe(
 *   // Notice in here we're merging 3 subscriptions to `shared$`.
 *   connect(shared$ => merge(
 *     shared$.pipe(map(n => `all ${ n }`)),
 *     shared$.pipe(filter(n => n % 2 === 0), map(n => `even ${ n }`)),
 *     shared$.pipe(filter(n => n % 2 === 1), map(n => `odd ${ n }`))
 *   ))
 * )
 * .subscribe(console.log);
 *
 * // Expected output: (notice only one subscription)
 * 'subscription started'
 * 'source emitted 1'
 * 'all 1'
 * 'odd 1'
 * 'source emitted 2'
 * 'all 2'
 * 'even 2'
 * 'source emitted 3'
 * 'all 3'
 * 'odd 3'
 * 'source emitted 4'
 * 'all 4'
 * 'even 4'
 * 'source emitted 5'
 * 'all 5'
 * 'odd 5'
 * ```
 *
 * @param selector A function used to set up the multicast. Gives you a multicast observable
 * that is not yet connected. With that, you're expected to create and return
 * and Observable, that when subscribed to, will utilize the multicast observable.
 * After this function is executed -- and its return value subscribed to -- the
 * operator will subscribe to the source, and the connection will be made.
 * @param config The configuration object for `connect`.
 */
export function connect<T, O extends ObservableInput<unknown>>(
  selector: (shared: Observable<T>) => O,
  config: ConnectConfig<T> = DEFAULT_CONFIG
): OperatorFunction<T, ObservedValueOf<O>> {
  const { connector } = config;
  return operate((source, subscriber) => {
    const subject = connector();
    innerFrom(selector(fromSubscribable(subject))).subscribe(subscriber);
    subscriber.add(source.subscribe(subject));
  });
}
