import { Subject } from '../Subject';
import { Observable } from '../Observable';
import { Subscription } from '../Subscription';
/**
 * @class ConnectableObservable<T>
 * @deprecated Will be removed in v8. Use {@link connectable} to create a connectable observable.
 * If you are using the `refCount` method of `ConnectableObservable`, use the {@link share} operator
 * instead.
 * Details: https://rxjs.dev/deprecations/multicasting
 */
export declare class ConnectableObservable<T> extends Observable<T> {
    source: Observable<T>;
    protected subjectFactory: () => Subject<T>;
    protected _subject: Subject<T> | null;
    protected _refCount: number;
    protected _connection: Subscription | null;
    /**
     * @param source The source observable
     * @param subjectFactory The factory that creates the subject used internally.
     * @deprecated Will be removed in v8. Use {@link connectable} to create a connectable observable.
     * `new ConnectableObservable(source, factory)` is equivalent to
     * `connectable(source, { connector: factory })`.
     * When the `refCount()` method is needed, the {@link share} operator should be used instead:
     * `new ConnectableObservable(source, factory).refCount()` is equivalent to
     * `source.pipe(share({ connector: factory }))`.
     * Details: https://rxjs.dev/deprecations/multicasting
     */
    constructor(source: Observable<T>, subjectFactory: () => Subject<T>);
    protected getSubject(): Subject<T>;
    protected _teardown(): void;
    /**
     * @deprecated {@link ConnectableObservable} will be removed in v8. Use {@link connectable} instead.
     * Details: https://rxjs.dev/deprecations/multicasting
     */
    connect(): Subscription;
    /**
     * @deprecated {@link ConnectableObservable} will be removed in v8. Use the {@link share} operator instead.
     * Details: https://rxjs.dev/deprecations/multicasting
     */
    refCount(): Observable<T>;
}
//# sourceMappingURL=ConnectableObservable.d.ts.map