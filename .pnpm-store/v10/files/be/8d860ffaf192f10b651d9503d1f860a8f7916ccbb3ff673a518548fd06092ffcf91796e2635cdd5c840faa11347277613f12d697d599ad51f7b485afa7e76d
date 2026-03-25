import { Operator } from './Operator';
import { SafeSubscriber, Subscriber } from './Subscriber';
import { isSubscription, Subscription } from './Subscription';
import { TeardownLogic, OperatorFunction, Subscribable, Observer } from './types';
import { observable as Symbol_observable } from './symbol/observable';
import { pipeFromArray } from './util/pipe';
import { config } from './config';
import { isFunction } from './util/isFunction';
import { errorContext } from './util/errorContext';

/**
 * A representation of any set of values over any amount of time. This is the most basic building block
 * of RxJS.
 *
 * @class Observable<T>
 */
export class Observable<T> implements Subscribable<T> {
  /**
   * @deprecated Internal implementation detail, do not use directly. Will be made internal in v8.
   */
  source: Observable<any> | undefined;

  /**
   * @deprecated Internal implementation detail, do not use directly. Will be made internal in v8.
   */
  operator: Operator<any, T> | undefined;

  /**
   * @constructor
   * @param {Function} subscribe the function that is called when the Observable is
   * initially subscribed to. This function is given a Subscriber, to which new values
   * can be `next`ed, or an `error` method can be called to raise an error, or
   * `complete` can be called to notify of a successful completion.
   */
  constructor(subscribe?: (this: Observable<T>, subscriber: Subscriber<T>) => TeardownLogic) {
    if (subscribe) {
      this._subscribe = subscribe;
    }
  }

  // HACK: Since TypeScript inherits static properties too, we have to
  // fight against TypeScript here so Subject can have a different static create signature
  /**
   * Creates a new Observable by calling the Observable constructor
   * @owner Observable
   * @method create
   * @param {Function} subscribe? the subscriber function to be passed to the Observable constructor
   * @return {Observable} a new observable
   * @nocollapse
   * @deprecated Use `new Observable()` instead. Will be removed in v8.
   */
  static create: (...args: any[]) => any = <T>(subscribe?: (subscriber: Subscriber<T>) => TeardownLogic) => {
    return new Observable<T>(subscribe);
  };

  /**
   * Creates a new Observable, with this Observable instance as the source, and the passed
   * operator defined as the new observable's operator.
   * @method lift
   * @param operator the operator defining the operation to take on the observable
   * @return a new observable with the Operator applied
   * @deprecated Internal implementation detail, do not use directly. Will be made internal in v8.
   * If you have implemented an operator using `lift`, it is recommended that you create an
   * operator by simply returning `new Observable()` directly. See "Creating new operators from
   * scratch" section here: https://rxjs.dev/guide/operators
   */
  lift<R>(operator?: Operator<T, R>): Observable<R> {
    const observable = new Observable<R>();
    observable.source = this;
    observable.operator = operator;
    return observable;
  }

  subscribe(observerOrNext?: Partial<Observer<T>> | ((value: T) => void)): Subscription;
  /** @deprecated Instead of passing separate callback arguments, use an observer argument. Signatures taking separate callback arguments will be removed in v8. Details: https://rxjs.dev/deprecations/subscribe-arguments */
  subscribe(next?: ((value: T) => void) | null, error?: ((error: any) => void) | null, complete?: (() => void) | null): Subscription;
  /**
   * Invokes an execution of an Observable and registers Observer handlers for notifications it will emit.
   *
   * <span class="informal">Use it when you have all these Observables, but still nothing is happening.</span>
   *
   * `subscribe` is not a regular operator, but a method that calls Observable's internal `subscribe` function. It
   * might be for example a function that you passed to Observable's constructor, but most of the time it is
   * a library implementation, which defines what will be emitted by an Observable, and when it be will emitted. This means
   * that calling `subscribe` is actually the moment when Observable starts its work, not when it is created, as it is often
   * the thought.
   *
   * Apart from starting the execution of an Observable, this method allows you to listen for values
   * that an Observable emits, as well as for when it completes or errors. You can achieve this in two
   * of the following ways.
   *
   * The first way is creating an object that implements {@link Observer} interface. It should have methods
   * defined by that interface, but note that it should be just a regular JavaScript object, which you can create
   * yourself in any way you want (ES6 class, classic function constructor, object literal etc.). In particular, do
   * not attempt to use any RxJS implementation details to create Observers - you don't need them. Remember also
   * that your object does not have to implement all methods. If you find yourself creating a method that doesn't
   * do anything, you can simply omit it. Note however, if the `error` method is not provided and an error happens,
   * it will be thrown asynchronously. Errors thrown asynchronously cannot be caught using `try`/`catch`. Instead,
   * use the {@link onUnhandledError} configuration option or use a runtime handler (like `window.onerror` or
   * `process.on('error)`) to be notified of unhandled errors. Because of this, it's recommended that you provide
   * an `error` method to avoid missing thrown errors.
   *
   * The second way is to give up on Observer object altogether and simply provide callback functions in place of its methods.
   * This means you can provide three functions as arguments to `subscribe`, where the first function is equivalent
   * of a `next` method, the second of an `error` method and the third of a `complete` method. Just as in case of an Observer,
   * if you do not need to listen for something, you can omit a function by passing `undefined` or `null`,
   * since `subscribe` recognizes these functions by where they were placed in function call. When it comes
   * to the `error` function, as with an Observer, if not provided, errors emitted by an Observable will be thrown asynchronously.
   *
   * You can, however, subscribe with no parameters at all. This may be the case where you're not interested in terminal events
   * and you also handled emissions internally by using operators (e.g. using `tap`).
   *
   * Whichever style of calling `subscribe` you use, in both cases it returns a Subscription object.
   * This object allows you to call `unsubscribe` on it, which in turn will stop the work that an Observable does and will clean
   * up all resources that an Observable used. Note that cancelling a subscription will not call `complete` callback
   * provided to `subscribe` function, which is reserved for a regular completion signal that comes from an Observable.
   *
   * Remember that callbacks provided to `subscribe` are not guaranteed to be called asynchronously.
   * It is an Observable itself that decides when these functions will be called. For example {@link of}
   * by default emits all its values synchronously. Always check documentation for how given Observable
   * will behave when subscribed and if its default behavior can be modified with a `scheduler`.
   *
   * #### Examples
   *
   * Subscribe with an {@link guide/observer Observer}
   *
   * ```ts
   * import { of } from 'rxjs';
   *
   * const sumObserver = {
   *   sum: 0,
   *   next(value) {
   *     console.log('Adding: ' + value);
   *     this.sum = this.sum + value;
   *   },
   *   error() {
   *     // We actually could just remove this method,
   *     // since we do not really care about errors right now.
   *   },
   *   complete() {
   *     console.log('Sum equals: ' + this.sum);
   *   }
   * };
   *
   * of(1, 2, 3) // Synchronously emits 1, 2, 3 and then completes.
   *   .subscribe(sumObserver);
   *
   * // Logs:
   * // 'Adding: 1'
   * // 'Adding: 2'
   * // 'Adding: 3'
   * // 'Sum equals: 6'
   * ```
   *
   * Subscribe with functions ({@link deprecations/subscribe-arguments deprecated})
   *
   * ```ts
   * import { of } from 'rxjs'
   *
   * let sum = 0;
   *
   * of(1, 2, 3).subscribe(
   *   value => {
   *     console.log('Adding: ' + value);
   *     sum = sum + value;
   *   },
   *   undefined,
   *   () => console.log('Sum equals: ' + sum)
   * );
   *
   * // Logs:
   * // 'Adding: 1'
   * // 'Adding: 2'
   * // 'Adding: 3'
   * // 'Sum equals: 6'
   * ```
   *
   * Cancel a subscription
   *
   * ```ts
   * import { interval } from 'rxjs';
   *
   * const subscription = interval(1000).subscribe({
   *   next(num) {
   *     console.log(num)
   *   },
   *   complete() {
   *     // Will not be called, even when cancelling subscription.
   *     console.log('completed!');
   *   }
   * });
   *
   * setTimeout(() => {
   *   subscription.unsubscribe();
   *   console.log('unsubscribed!');
   * }, 2500);
   *
   * // Logs:
   * // 0 after 1s
   * // 1 after 2s
   * // 'unsubscribed!' after 2.5s
   * ```
   *
   * @param {Observer|Function} observerOrNext (optional) Either an observer with methods to be called,
   * or the first of three possible handlers, which is the handler for each value emitted from the subscribed
   * Observable.
   * @param {Function} error (optional) A handler for a terminal event resulting from an error. If no error handler is provided,
   * the error will be thrown asynchronously as unhandled.
   * @param {Function} complete (optional) A handler for a terminal event resulting from successful completion.
   * @return {Subscription} a subscription reference to the registered handlers
   * @method subscribe
   */
  subscribe(
    observerOrNext?: Partial<Observer<T>> | ((value: T) => void) | null,
    error?: ((error: any) => void) | null,
    complete?: (() => void) | null
  ): Subscription {
    const subscriber = isSubscriber(observerOrNext) ? observerOrNext : new SafeSubscriber(observerOrNext, error, complete);

    errorContext(() => {
      const { operator, source } = this;
      subscriber.add(
        operator
          ? // We're dealing with a subscription in the
            // operator chain to one of our lifted operators.
            operator.call(subscriber, source)
          : source
          ? // If `source` has a value, but `operator` does not, something that
            // had intimate knowledge of our API, like our `Subject`, must have
            // set it. We're going to just call `_subscribe` directly.
            this._subscribe(subscriber)
          : // In all other cases, we're likely wrapping a user-provided initializer
            // function, so we need to catch errors and handle them appropriately.
            this._trySubscribe(subscriber)
      );
    });

    return subscriber;
  }

  /** @internal */
  protected _trySubscribe(sink: Subscriber<T>): TeardownLogic {
    try {
      return this._subscribe(sink);
    } catch (err) {
      // We don't need to return anything in this case,
      // because it's just going to try to `add()` to a subscription
      // above.
      sink.error(err);
    }
  }

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
   * @param next a handler for each value emitted by the observable
   * @return a promise that either resolves on observable completion or
   *  rejects with the handled error
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

  forEach(next: (value: T) => void, promiseCtor?: PromiseConstructorLike): Promise<void> {
    promiseCtor = getPromiseCtor(promiseCtor);

    return new promiseCtor<void>((resolve, reject) => {
      const subscriber = new SafeSubscriber<T>({
        next: (value) => {
          try {
            next(value);
          } catch (err) {
            reject(err);
            subscriber.unsubscribe();
          }
        },
        error: reject,
        complete: resolve,
      });
      this.subscribe(subscriber);
    }) as Promise<void>;
  }

  /** @internal */
  protected _subscribe(subscriber: Subscriber<any>): TeardownLogic {
    return this.source?.subscribe(subscriber);
  }

  /**
   * An interop point defined by the es7-observable spec https://github.com/zenparsing/es-observable
   * @method Symbol.observable
   * @return {Observable} this instance of the observable
   */
  [Symbol_observable]() {
    return this;
  }

  /* tslint:disable:max-line-length */
  pipe(): Observable<T>;
  pipe<A>(op1: OperatorFunction<T, A>): Observable<A>;
  pipe<A, B>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>): Observable<B>;
  pipe<A, B, C>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>): Observable<C>;
  pipe<A, B, C, D>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>
  ): Observable<D>;
  pipe<A, B, C, D, E>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>
  ): Observable<E>;
  pipe<A, B, C, D, E, F>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>
  ): Observable<F>;
  pipe<A, B, C, D, E, F, G>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>
  ): Observable<G>;
  pipe<A, B, C, D, E, F, G, H>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>
  ): Observable<H>;
  pipe<A, B, C, D, E, F, G, H, I>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>,
    op9: OperatorFunction<H, I>
  ): Observable<I>;
  pipe<A, B, C, D, E, F, G, H, I>(
    op1: OperatorFunction<T, A>,
    op2: OperatorFunction<A, B>,
    op3: OperatorFunction<B, C>,
    op4: OperatorFunction<C, D>,
    op5: OperatorFunction<D, E>,
    op6: OperatorFunction<E, F>,
    op7: OperatorFunction<F, G>,
    op8: OperatorFunction<G, H>,
    op9: OperatorFunction<H, I>,
    ...operations: OperatorFunction<any, any>[]
  ): Observable<unknown>;
  /* tslint:enable:max-line-length */

  /**
   * Used to stitch together functional operators into a chain.
   * @method pipe
   * @return {Observable} the Observable result of all of the operators having
   * been called in the order they were passed in.
   *
   * ## Example
   *
   * ```ts
   * import { interval, filter, map, scan } from 'rxjs';
   *
   * interval(1000)
   *   .pipe(
   *     filter(x => x % 2 === 0),
   *     map(x => x + x),
   *     scan((acc, x) => acc + x)
   *   )
   *   .subscribe(x => console.log(x));
   * ```
   */
  pipe(...operations: OperatorFunction<any, any>[]): Observable<any> {
    return pipeFromArray(operations)(this);
  }

  /* tslint:disable:max-line-length */
  /** @deprecated Replaced with {@link firstValueFrom} and {@link lastValueFrom}. Will be removed in v8. Details: https://rxjs.dev/deprecations/to-promise */
  toPromise(): Promise<T | undefined>;
  /** @deprecated Replaced with {@link firstValueFrom} and {@link lastValueFrom}. Will be removed in v8. Details: https://rxjs.dev/deprecations/to-promise */
  toPromise(PromiseCtor: typeof Promise): Promise<T | undefined>;
  /** @deprecated Replaced with {@link firstValueFrom} and {@link lastValueFrom}. Will be removed in v8. Details: https://rxjs.dev/deprecations/to-promise */
  toPromise(PromiseCtor: PromiseConstructorLike): Promise<T | undefined>;
  /* tslint:enable:max-line-length */

  /**
   * Subscribe to this Observable and get a Promise resolving on
   * `complete` with the last emission (if any).
   *
   * **WARNING**: Only use this with observables you *know* will complete. If the source
   * observable does not complete, you will end up with a promise that is hung up, and
   * potentially all of the state of an async function hanging out in memory. To avoid
   * this situation, look into adding something like {@link timeout}, {@link take},
   * {@link takeWhile}, or {@link takeUntil} amongst others.
   *
   * @method toPromise
   * @param [promiseCtor] a constructor function used to instantiate
   * the Promise
   * @return A Promise that resolves with the last value emit, or
   * rejects on an error. If there were no emissions, Promise
   * resolves with undefined.
   * @deprecated Replaced with {@link firstValueFrom} and {@link lastValueFrom}. Will be removed in v8. Details: https://rxjs.dev/deprecations/to-promise
   */
  toPromise(promiseCtor?: PromiseConstructorLike): Promise<T | undefined> {
    promiseCtor = getPromiseCtor(promiseCtor);

    return new promiseCtor((resolve, reject) => {
      let value: T | undefined;
      this.subscribe(
        (x: T) => (value = x),
        (err: any) => reject(err),
        () => resolve(value)
      );
    }) as Promise<T | undefined>;
  }
}

/**
 * Decides between a passed promise constructor from consuming code,
 * A default configured promise constructor, and the native promise
 * constructor and returns it. If nothing can be found, it will throw
 * an error.
 * @param promiseCtor The optional promise constructor to passed by consuming code
 */
function getPromiseCtor(promiseCtor: PromiseConstructorLike | undefined) {
  return promiseCtor ?? config.Promise ?? Promise;
}

function isObserver<T>(value: any): value is Observer<T> {
  return value && isFunction(value.next) && isFunction(value.error) && isFunction(value.complete);
}

function isSubscriber<T>(value: any): value is Subscriber<T> {
  return (value && value instanceof Subscriber) || (isObserver(value) && isSubscription(value));
}
