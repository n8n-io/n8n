import { Observable } from '../Observable';
import { ConnectableObservable } from '../observable/ConnectableObservable';
import { OperatorFunction, UnaryFunction, ObservableInput, ObservedValueOf } from '../types';
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
export declare function publish<T>(): UnaryFunction<Observable<T>, ConnectableObservable<T>>;
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
export declare function publish<T, O extends ObservableInput<any>>(selector: (shared: Observable<T>) => O): OperatorFunction<T, ObservedValueOf<O>>;
//# sourceMappingURL=publish.d.ts.map