import { Observable } from '../Observable';
import { Subject } from '../Subject';
import { multicast } from './multicast';
import { ConnectableObservable } from '../observable/ConnectableObservable';
import { MonoTypeOperatorFunction, OperatorFunction, UnaryFunction, ObservableInput, ObservedValueOf } from '../types';
import { connect } from './connect';

/**
 * Returns a connectable observable that, when connected, will multicast
 * all values through a single underlying {@link Subject} instance.
 *
 * @deprecated Will be removed in v8. To create a connectable observable, use {@link connectable}.
 * `source.pipe(publish())` is equivalent to
 * `connectable(source, { connector: () => new Subject(), resetOnDisconnect: false })`.
 * If you're using {@link refCount} after `publish`, use {@link share} operator instead.
 * `source.pipe(publish(), refCount())` is equivalent to
 * `source.pipe(share({ resetOnError: false, resetOnComplete: false, resetOnRefCountZero: false }))`.
 * Details: https://rxjs.dev/deprecations/multicasting
 */
export function publish<T>(): UnaryFunction<Observable<T>, ConnectableObservable<T>>;

/**
 * Returns an observable, that when subscribed to, creates an underlying {@link Subject},
 * provides an observable view of it to a `selector` function, takes the observable result of
 * that selector function and subscribes to it, sending its values to the consumer, _then_ connects
 * the subject to the original source.
 *
 * @param selector A function used to setup multicasting prior to automatic connection.
 *
 * @deprecated Will be removed in v8. Use the {@link connect} operator instead.
 * `publish(selector)` is equivalent to `connect(selector)`.
 * Details: https://rxjs.dev/deprecations/multicasting
 */
export function publish<T, O extends ObservableInput<any>>(selector: (shared: Observable<T>) => O): OperatorFunction<T, ObservedValueOf<O>>;

/**
 * Returns a ConnectableObservable, which is a variety of Observable that waits until its connect method is called
 * before it begins emitting items to those Observers that have subscribed to it.
 *
 * <span class="informal">Makes a cold Observable hot</span>
 *
 * ![](publish.png)
 *
 * ## Examples
 *
 * Make `source$` hot by applying `publish` operator, then merge each inner observable into a single one
 * and subscribe
 *
 * ```ts
 * import { zip, interval, of, map, publish, merge, tap } from 'rxjs';
 *
 * const source$ = zip(interval(2000), of(1, 2, 3, 4, 5, 6, 7, 8, 9))
 *   .pipe(map(([, number]) => number));
 *
 * source$
 *   .pipe(
 *     publish(multicasted$ =>
 *       merge(
 *         multicasted$.pipe(tap(x => console.log('Stream 1:', x))),
 *         multicasted$.pipe(tap(x => console.log('Stream 2:', x))),
 *         multicasted$.pipe(tap(x => console.log('Stream 3:', x)))
 *       )
 *     )
 *   )
 *   .subscribe();
 *
 * // Results every two seconds
 * // Stream 1: 1
 * // Stream 2: 1
 * // Stream 3: 1
 * // ...
 * // Stream 1: 9
 * // Stream 2: 9
 * // Stream 3: 9
 * ```
 *
 * @see {@link publishLast}
 * @see {@link publishReplay}
 * @see {@link publishBehavior}
 *
 * @param selector Optional selector function which can use the multicasted source sequence as many times
 * as needed, without causing multiple subscriptions to the source sequence.
 * Subscribers to the given source will receive all notifications of the source from the time of the subscription on.
 * @return A function that returns a ConnectableObservable that upon connection
 * causes the source Observable to emit items to its Observers.
 * @deprecated Will be removed in v8. Use the {@link connectable} observable, the {@link connect} operator or the
 * {@link share} operator instead. See the overloads below for equivalent replacement examples of this operator's
 * behaviors.
 * Details: https://rxjs.dev/deprecations/multicasting
 */
export function publish<T, R>(selector?: OperatorFunction<T, R>): MonoTypeOperatorFunction<T> | OperatorFunction<T, R> {
  return selector ? (source) => connect(selector)(source) : (source) => multicast(new Subject<T>())(source);
}
