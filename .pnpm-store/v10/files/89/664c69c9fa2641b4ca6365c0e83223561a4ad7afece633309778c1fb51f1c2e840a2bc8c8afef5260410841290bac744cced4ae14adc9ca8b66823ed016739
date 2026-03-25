import { Observer } from './types';
import { Subscription } from './Subscription';
/**
 * Implements the {@link Observer} interface and extends the
 * {@link Subscription} class. While the {@link Observer} is the public API for
 * consuming the values of an {@link Observable}, all Observers get converted to
 * a Subscriber, in order to provide Subscription-like capabilities such as
 * `unsubscribe`. Subscriber is a common type in RxJS, and crucial for
 * implementing operators, but it is rarely used as a public API.
 *
 * @class Subscriber<T>
 */
export declare class Subscriber<T> extends Subscription implements Observer<T> {
    /**
     * A static factory for a Subscriber, given a (potentially partial) definition
     * of an Observer.
     * @param next The `next` callback of an Observer.
     * @param error The `error` callback of an
     * Observer.
     * @param complete The `complete` callback of an
     * Observer.
     * @return A Subscriber wrapping the (partially defined)
     * Observer represented by the given arguments.
     * @nocollapse
     * @deprecated Do not use. Will be removed in v8. There is no replacement for this
     * method, and there is no reason to be creating instances of `Subscriber` directly.
     * If you have a specific use case, please file an issue.
     */
    static create<T>(next?: (x?: T) => void, error?: (e?: any) => void, complete?: () => void): Subscriber<T>;
    /** @deprecated Internal implementation detail, do not use directly. Will be made internal in v8. */
    protected isStopped: boolean;
    /** @deprecated Internal implementation detail, do not use directly. Will be made internal in v8. */
    protected destination: Subscriber<any> | Observer<any>;
    /**
     * @deprecated Internal implementation detail, do not use directly. Will be made internal in v8.
     * There is no reason to directly create an instance of Subscriber. This type is exported for typings reasons.
     */
    constructor(destination?: Subscriber<any> | Observer<any>);
    /**
     * The {@link Observer} callback to receive notifications of type `next` from
     * the Observable, with a value. The Observable may call this method 0 or more
     * times.
     * @param {T} [value] The `next` value.
     * @return {void}
     */
    next(value?: T): void;
    /**
     * The {@link Observer} callback to receive notifications of type `error` from
     * the Observable, with an attached `Error`. Notifies the Observer that
     * the Observable has experienced an error condition.
     * @param {any} [err] The `error` exception.
     * @return {void}
     */
    error(err?: any): void;
    /**
     * The {@link Observer} callback to receive a valueless notification of type
     * `complete` from the Observable. Notifies the Observer that the Observable
     * has finished sending push-based notifications.
     * @return {void}
     */
    complete(): void;
    unsubscribe(): void;
    protected _next(value: T): void;
    protected _error(err: any): void;
    protected _complete(): void;
}
export declare class SafeSubscriber<T> extends Subscriber<T> {
    constructor(observerOrNext?: Partial<Observer<T>> | ((value: T) => void) | null, error?: ((e?: any) => void) | null, complete?: (() => void) | null);
}
/**
 * The observer used as a stub for subscriptions where the user did not
 * pass any arguments to `subscribe`. Comes with the default error handling
 * behavior.
 */
export declare const EMPTY_OBSERVER: Readonly<Observer<any>> & {
    closed: true;
};
//# sourceMappingURL=Subscriber.d.ts.map