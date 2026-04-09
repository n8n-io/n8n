import { Operator } from './Operator';
import { Subscriber } from './Subscriber';
import { Subscription } from './Subscription';
import { TeardownLogic, OperatorFunction, Subscribable, Observer } from './types';
/**
 * A representation of any set of values over any amount of time. This is the most basic building block
 * of RxJS.
 */
export declare class Observable<T> implements Subscribable<T> {
    /**
     * @deprecated Internal implementation detail, do not use directly. Will be made internal in v8.
     */
    source: Observable<any> | undefined;
    /**
     * @deprecated Internal implementation detail, do not use directly. Will be made internal in v8.
     */
    operator: Operator<any, T> | undefined;
    /**
     * @param subscribe The function that is called when the Observable is
     * initially subscribed to. This function is given a Subscriber, to which new values
     * can be `next`ed, or an `error` method can be called to raise an error, or
     * `complete` can be called to notify of a successful completion.
     */
    constructor(subscribe?: (this: Observable<T>, subscriber: Subscriber<T>) => TeardownLogic);
    /**
     * Creates a new Observable by calling the Observable constructor
     * @param subscribe the subscriber function to be passed to the Observable constructor
     * @return A new observable.
     * @deprecated Use `new Observable()` instead. Will be removed in v8.
     */
    static create: (...args: any[]) => any;
    /**
     * Creates a new Observable, with this Observable instance as the source, and the passed
     * operator defined as the new observable's operator.
     * @param operator the operator defining the operation to take on the observable
     * @return A new observable with the Operator applied.
     * @deprecated Internal implementation detail, do not use directly. Will be made internal in v8.
     * If you have implemented an operator using `lift`, it is recommended that you create an
     * operator by simply returning `new Observable()` directly. See "Creating new operators from
     * scratch" section here: https://rxjs.dev/guide/operators
     */
    lift<R>(operator?: Operator<T, R>): Observable<R>;
    subscribe(observerOrNext?: Partial<Observer<T>> | ((value: T) => void)): Subscription;
    /** @deprecated Instead of passing separate callback arguments, use an observer argument. Signatures taking separate callback arguments will be removed in v8. Details: https://rxjs.dev/deprecations/subscribe-arguments */
    subscribe(next?: ((value: T) => void) | null, error?: ((error: any) => void) | null, complete?: (() => void) | null): Subscription;
    /**
     * Used as a NON-CANCELLABLE means of subscribing to an observable, for use with
     * APIs that expect promises, like `async/await`. You cannot unsubscribe from this.
     *
     * **WARNING**: Only use this with observables you *know* will complete. If the source
     * observable does not complete, you will end up with a promise that is hung up, and
     * potentially all of the state of an async function hanging out in memory. To avoid
     * this situation, look into adding something like {@link timeout}, {@link take},
     * {@link takeWhile}, or {@link takeUntil} amongst others.
     *
     * #### Example
     *
     * ```ts
     * import { interval, take } from 'rxjs';
     *
     * const source$ = interval(1000).pipe(take(4));
     *
     * async function getTotal() {
     *   let total = 0;
     *
     *   await source$.forEach(value => {
     *     total += value;
     *     console.log('observable -> ' + value);
     *   });
     *
     *   return total;
     * }
     *
     * getTotal().then(
     *   total => console.log('Total: ' + total)
     * );
     *
     * // Expected:
     * // 'observable -> 0'
     * // 'observable -> 1'
     * // 'observable -> 2'
     * // 'observable -> 3'
     * // 'Total: 6'
     * ```
     *
     * @param next A handler for each value emitted by the observable.
     * @return A promise that either resolves on observable completion or
     * rejects with the handled error.
     */
    forEach(next: (value: T) => void): Promise<void>;
    /**
     * @param next a handler for each value emitted by the observable
     * @param promiseCtor a constructor function used to instantiate the Promise
     * @return a promise that either resolves on observable completion or
     *  rejects with the handled error
     * @deprecated Passing a Promise constructor will no longer be available
     * in upcoming versions of RxJS. This is because it adds weight to the library, for very
     * little benefit. If you need this functionality, it is recommended that you either
     * polyfill Promise, or you create an adapter to convert the returned native promise
     * to whatever promise implementation you wanted. Will be removed in v8.
     */
    forEach(next: (value: T) => void, promiseCtor: PromiseConstructorLike): Promise<void>;
    pipe(): Observable<T>;
    pipe<A>(op1: OperatorFunction<T, A>): Observable<A>;
    pipe<A, B>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>): Observable<B>;
    pipe<A, B, C>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>): Observable<C>;
    pipe<A, B, C, D>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>): Observable<D>;
    pipe<A, B, C, D, E>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>): Observable<E>;
    pipe<A, B, C, D, E, F>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>): Observable<F>;
    pipe<A, B, C, D, E, F, G>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>): Observable<G>;
    pipe<A, B, C, D, E, F, G, H>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>, op8: OperatorFunction<G, H>): Observable<H>;
    pipe<A, B, C, D, E, F, G, H, I>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>, op8: OperatorFunction<G, H>, op9: OperatorFunction<H, I>): Observable<I>;
    pipe<A, B, C, D, E, F, G, H, I>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>, op8: OperatorFunction<G, H>, op9: OperatorFunction<H, I>, ...operations: OperatorFunction<any, any>[]): Observable<unknown>;
    /** @deprecated Replaced with {@link firstValueFrom} and {@link lastValueFrom}. Will be removed in v8. Details: https://rxjs.dev/deprecations/to-promise */
    toPromise(): Promise<T | undefined>;
    /** @deprecated Replaced with {@link firstValueFrom} and {@link lastValueFrom}. Will be removed in v8. Details: https://rxjs.dev/deprecations/to-promise */
    toPromise(PromiseCtor: typeof Promise): Promise<T | undefined>;
    /** @deprecated Replaced with {@link firstValueFrom} and {@link lastValueFrom}. Will be removed in v8. Details: https://rxjs.dev/deprecations/to-promise */
    toPromise(PromiseCtor: PromiseConstructorLike): Promise<T | undefined>;
}
//# sourceMappingURL=Observable.d.ts.map