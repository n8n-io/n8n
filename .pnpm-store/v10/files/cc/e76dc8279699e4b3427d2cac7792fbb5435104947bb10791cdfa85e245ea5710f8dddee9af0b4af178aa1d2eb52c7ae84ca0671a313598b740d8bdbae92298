import { Subject } from '../Subject';
import { Observable } from '../Observable';
import { ConnectableObservable } from '../observable/ConnectableObservable';
import { OperatorFunction, UnaryFunction, ObservedValueOf, ObservableInput } from '../types';
/**
 * An operator that creates a {@link ConnectableObservable}, that when connected,
 * with the `connect` method, will use the provided subject to multicast the values
 * from the source to all consumers.
 *
 * @param subject The subject to multicast through.
 * @return A function that returns a {@link ConnectableObservable}
 * @deprecated Will be removed in v8. To create a connectable observable, use {@link connectable}.
 * If you're using {@link refCount} after `multicast`, use the {@link share} operator instead.
 * `multicast(subject), refCount()` is equivalent to
 * `share({ connector: () => subject, resetOnError: false, resetOnComplete: false, resetOnRefCountZero: false })`.
 * Details: https://rxjs.dev/deprecations/multicasting
 */
export declare function multicast<T>(subject: Subject<T>): UnaryFunction<Observable<T>, ConnectableObservable<T>>;
/**
 * Because this is deprecated in favor of the {@link connect} operator, and was otherwise poorly documented,
 * rather than duplicate the effort of documenting the same behavior, please see documentation for the
 * {@link connect} operator.
 *
 * @param subject The subject used to multicast.
 * @param selector A setup function to setup the multicast
 * @return A function that returns an observable that mirrors the observable returned by the selector.
 * @deprecated Will be removed in v8. Use the {@link connect} operator instead.
 * `multicast(subject, selector)` is equivalent to
 * `connect(selector, { connector: () => subject })`.
 * Details: https://rxjs.dev/deprecations/multicasting
 */
export declare function multicast<T, O extends ObservableInput<any>>(subject: Subject<T>, selector: (shared: Observable<T>) => O): OperatorFunction<T, ObservedValueOf<O>>;
/**
 * An operator that creates a {@link ConnectableObservable}, that when connected,
 * with the `connect` method, will use the provided subject to multicast the values
 * from the source to all consumers.
 *
 * @param subjectFactory A factory that will be called to create the subject. Passing a function here
 * will cause the underlying subject to be "reset" on error, completion, or refCounted unsubscription of
 * the source.
 * @return A function that returns a {@link ConnectableObservable}
 * @deprecated Will be removed in v8. To create a connectable observable, use {@link connectable}.
 * If you're using {@link refCount} after `multicast`, use the {@link share} operator instead.
 * `multicast(() => new BehaviorSubject('test')), refCount()` is equivalent to
 * `share({ connector: () => new BehaviorSubject('test') })`.
 * Details: https://rxjs.dev/deprecations/multicasting
 */
export declare function multicast<T>(subjectFactory: () => Subject<T>): UnaryFunction<Observable<T>, ConnectableObservable<T>>;
/**
 * Because this is deprecated in favor of the {@link connect} operator, and was otherwise poorly documented,
 * rather than duplicate the effort of documenting the same behavior, please see documentation for the
 * {@link connect} operator.
 *
 * @param subjectFactory A factory that creates the subject used to multicast.
 * @param selector A function to setup the multicast and select the output.
 * @return A function that returns an observable that mirrors the observable returned by the selector.
 * @deprecated Will be removed in v8. Use the {@link connect} operator instead.
 * `multicast(subjectFactory, selector)` is equivalent to
 * `connect(selector, { connector: subjectFactory })`.
 * Details: https://rxjs.dev/deprecations/multicasting
 */
export declare function multicast<T, O extends ObservableInput<any>>(subjectFactory: () => Subject<T>, selector: (shared: Observable<T>) => O): OperatorFunction<T, ObservedValueOf<O>>;
//# sourceMappingURL=multicast.d.ts.map