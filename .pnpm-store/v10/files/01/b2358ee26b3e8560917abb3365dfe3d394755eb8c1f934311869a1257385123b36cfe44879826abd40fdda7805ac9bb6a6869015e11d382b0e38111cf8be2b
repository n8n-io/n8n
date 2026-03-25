// https://github.com/microsoft/TypeScript/issues/40462#issuecomment-689879308
/// <reference lib="esnext.asynciterable" />

import { Observable } from './Observable';
import { Subscription } from './Subscription';

/**
 * Note: This will add Symbol.observable globally for all TypeScript users,
 * however, we are no longer polyfilling Symbol.observable
 */
declare global {
  interface SymbolConstructor {
    readonly observable: symbol;
  }
}

/* OPERATOR INTERFACES */

/**
 * A function type interface that describes a function that accepts one parameter `T`
 * and returns another parameter `R`.
 *
 * Usually used to describe {@link OperatorFunction} - it always takes a single
 * parameter (the source Observable) and returns another Observable.
 */
export interface UnaryFunction<T, R> {
  (source: T): R;
}

export interface OperatorFunction<T, R> extends UnaryFunction<Observable<T>, Observable<R>> {}

export type FactoryOrValue<T> = T | (() => T);

export interface MonoTypeOperatorFunction<T> extends OperatorFunction<T, T> {}

/**
 * A value and the time at which it was emitted.
 *
 * Emitted by the `timestamp` operator
 *
 * @see {@link timestamp}
 */
export interface Timestamp<T> {
  value: T;
  /**
   * The timestamp. By default, this is in epoch milliseconds.
   * Could vary based on the timestamp provider passed to the operator.
   */
  timestamp: number;
}

/**
 * A value emitted and the amount of time since the last value was emitted.
 *
 * Emitted by the `timeInterval` operator.
 *
 * @see {@link timeInterval}
 */
export interface TimeInterval<T> {
  value: T;

  /**
   * The amount of time between this value's emission and the previous value's emission.
   * If this is the first emitted value, then it will be the amount of time since subscription
   * started.
   */
  interval: number;
}

/* SUBSCRIPTION INTERFACES */

export interface Unsubscribable {
  unsubscribe(): void;
}

export type TeardownLogic = Subscription | Unsubscribable | (() => void) | void;

export interface SubscriptionLike extends Unsubscribable {
  unsubscribe(): void;
  readonly closed: boolean;
}

/**
 * @deprecated Do not use. Most likely you want to use `ObservableInput`. Will be removed in v8.
 */
export type SubscribableOrPromise<T> = Subscribable<T> | Subscribable<never> | PromiseLike<T> | InteropObservable<T>;

/** OBSERVABLE INTERFACES */

export interface Subscribable<T> {
  subscribe(observer: Partial<Observer<T>>): Unsubscribable;
}

/**
 * Valid types that can be converted to observables.
 */
export type ObservableInput<T> =
  | Observable<T>
  | InteropObservable<T>
  | AsyncIterable<T>
  | PromiseLike<T>
  | ArrayLike<T>
  | Iterable<T>
  | ReadableStreamLike<T>;

/**
 * @deprecated Renamed to {@link InteropObservable }. Will be removed in v8.
 */
export type ObservableLike<T> = InteropObservable<T>;

/**
 * An object that implements the `Symbol.observable` interface.
 */
export interface InteropObservable<T> {
  [Symbol.observable]: () => Subscribable<T>;
}

/* NOTIFICATIONS */

/**
 * A notification representing a "next" from an observable.
 * Can be used with {@link dematerialize}.
 */
export interface NextNotification<T> {
  /** The kind of notification. Always "N" */
  kind: 'N';
  /** The value of the notification. */
  value: T;
}

/**
 * A notification representing an "error" from an observable.
 * Can be used with {@link dematerialize}.
 */
export interface ErrorNotification {
  /** The kind of notification. Always "E" */
  kind: 'E';
  error: any;
}

/**
 * A notification representing a "completion" from an observable.
 * Can be used with {@link dematerialize}.
 */
export interface CompleteNotification {
  kind: 'C';
}

/**
 * Valid observable notification types.
 */
export type ObservableNotification<T> = NextNotification<T> | ErrorNotification | CompleteNotification;

/* OBSERVER INTERFACES */

export interface NextObserver<T> {
  closed?: boolean;
  next: (value: T) => void;
  error?: (err: any) => void;
  complete?: () => void;
}

export interface ErrorObserver<T> {
  closed?: boolean;
  next?: (value: T) => void;
  error: (err: any) => void;
  complete?: () => void;
}

export interface CompletionObserver<T> {
  closed?: boolean;
  next?: (value: T) => void;
  error?: (err: any) => void;
  complete: () => void;
}

export type PartialObserver<T> = NextObserver<T> | ErrorObserver<T> | CompletionObserver<T>;

/**
 * An object interface that defines a set of callback functions a user can use to get
 * notified of any set of {@link Observable}
 * {@link guide/glossary-and-semantics#notification notification} events.
 *
 * For more info, please refer to {@link guide/observer this guide}.
 */
export interface Observer<T> {
  /**
   * A callback function that gets called by the producer during the subscription when
   * the producer "has" the `value`. It won't be called if `error` or `complete` callback
   * functions have been called, nor after the consumer has unsubscribed.
   *
   * For more info, please refer to {@link guide/glossary-and-semantics#next this guide}.
   */
  next: (value: T) => void;
  /**
   * A callback function that gets called by the producer if and when it encountered a
   * problem of any kind. The errored value will be provided through the `err` parameter.
   * This callback can't be called more than one time, it can't be called if the
   * `complete` callback function have been called previously, nor it can't be called if
   * the consumer has unsubscribed.
   *
   * For more info, please refer to {@link guide/glossary-and-semantics#error this guide}.
   */
  error: (err: any) => void;
  /**
   * A callback function that gets called by the producer if and when it has no more
   * values to provide (by calling `next` callback function). This means that no error
   * has happened. This callback can't be called more than one time, it can't be called
   * if the `error` callback function have been called previously, nor it can't be called
   * if the consumer has unsubscribed.
   *
   * For more info, please refer to {@link guide/glossary-and-semantics#complete this guide}.
   */
  complete: () => void;
}

export interface SubjectLike<T> extends Observer<T>, Subscribable<T> {}

/* SCHEDULER INTERFACES */

export interface SchedulerLike extends TimestampProvider {
  schedule<T>(work: (this: SchedulerAction<T>, state: T) => void, delay: number, state: T): Subscription;
  schedule<T>(work: (this: SchedulerAction<T>, state?: T) => void, delay: number, state?: T): Subscription;
  schedule<T>(work: (this: SchedulerAction<T>, state?: T) => void, delay?: number, state?: T): Subscription;
}

export interface SchedulerAction<T> extends Subscription {
  schedule(state?: T, delay?: number): Subscription;
}

/**
 * This is a type that provides a method to allow RxJS to create a numeric timestamp
 */
export interface TimestampProvider {
  /**
   * Returns a timestamp as a number.
   *
   * This is used by types like `ReplaySubject` or operators like `timestamp` to calculate
   * the amount of time passed between events.
   */
  now(): number;
}

/**
 * Extracts the type from an `ObservableInput<any>`. If you have
 * `O extends ObservableInput<any>` and you pass in `Observable<number>`, or
 * `Promise<number>`, etc, it will type as `number`.
 */
export type ObservedValueOf<O> = O extends ObservableInput<infer T> ? T : never;

/**
 * Extracts a union of element types from an `ObservableInput<any>[]`.
 * If you have `O extends ObservableInput<any>[]` and you pass in
 * `Observable<string>[]` or `Promise<string>[]` you would get
 * back a type of `string`.
 * If you pass in `[Observable<string>, Observable<number>]` you would
 * get back a type of `string | number`.
 */
export type ObservedValueUnionFromArray<X> = X extends Array<ObservableInput<infer T>> ? T : never;

/**
 * @deprecated Renamed to {@link ObservedValueUnionFromArray}. Will be removed in v8.
 */
export type ObservedValuesFromArray<X> = ObservedValueUnionFromArray<X>;

/**
 * Extracts a tuple of element types from an `ObservableInput<any>[]`.
 * If you have `O extends ObservableInput<any>[]` and you pass in
 * `[Observable<string>, Observable<number>]` you would get back a type
 * of `[string, number]`.
 */
export type ObservedValueTupleFromArray<X> = { [K in keyof X]: ObservedValueOf<X[K]> };

/**
 * Used to infer types from arguments to functions like {@link forkJoin}.
 * So that you can have `forkJoin([Observable<A>, PromiseLike<B>]): Observable<[A, B]>`
 * et al.
 */
export type ObservableInputTuple<T> = {
  [K in keyof T]: ObservableInput<T[K]>;
};

/**
 * Constructs a new tuple with the specified type at the head.
 * If you declare `Cons<A, [B, C]>` you will get back `[A, B, C]`.
 */
export type Cons<X, Y extends readonly any[]> = ((arg: X, ...rest: Y) => any) extends (...args: infer U) => any ? U : never;

/**
 * Extracts the head of a tuple.
 * If you declare `Head<[A, B, C]>` you will get back `A`.
 */
export type Head<X extends readonly any[]> = ((...args: X) => any) extends (arg: infer U, ...rest: any[]) => any ? U : never;

/**
 * Extracts the tail of a tuple.
 * If you declare `Tail<[A, B, C]>` you will get back `[B, C]`.
 */
export type Tail<X extends readonly any[]> = ((...args: X) => any) extends (arg: any, ...rest: infer U) => any ? U : never;

/**
 * Extracts the generic value from an Array type.
 * If you have `T extends Array<any>`, and pass a `string[]` to it,
 * `ValueFromArray<T>` will return the actual type of `string`.
 */
export type ValueFromArray<A extends readonly unknown[]> = A extends Array<infer T> ? T : never;

/**
 * Gets the value type from an {@link ObservableNotification}, if possible.
 */
export type ValueFromNotification<T> = T extends { kind: 'N' | 'E' | 'C' }
  ? T extends NextNotification<any>
    ? T extends { value: infer V }
      ? V
      : undefined
    : never
  : never;

/**
 * A simple type to represent a gamut of "falsy" values... with a notable exception:
 * `NaN` is "falsy" however, it is not and cannot be typed via TypeScript. See
 * comments here: https://github.com/microsoft/TypeScript/issues/28682#issuecomment-707142417
 */
export type Falsy = null | undefined | false | 0 | -0 | 0n | '';

export type TruthyTypesOf<T> = T extends Falsy ? never : T;

// We shouldn't rely on this type definition being available globally yet since it's
// not necessarily available in every TS environment.
interface ReadableStreamDefaultReaderLike<T> {
  // HACK: As of TS 4.2.2, The provided types for the iterator results of a `ReadableStreamDefaultReader`
  // are significantly different enough from `IteratorResult` as to cause compilation errors.
  // The type at the time is `ReadableStreamDefaultReadResult`.
  read(): PromiseLike<
    | {
        done: false;
        value: T;
      }
    | { done: true; value?: undefined }
  >;
  releaseLock(): void;
}

/**
 * The base signature RxJS will look for to identify and use
 * a [ReadableStream](https://streams.spec.whatwg.org/#rs-class)
 * as an {@link ObservableInput} source.
 */
export interface ReadableStreamLike<T> {
  getReader(): ReadableStreamDefaultReaderLike<T>;
}

/**
 * An observable with a `connect` method that is used to create a subscription
 * to an underlying source, connecting it with all consumers via a multicast.
 */
export interface Connectable<T> extends Observable<T> {
  /**
   * (Idempotent) Calling this method will connect the underlying source observable to all subscribed consumers
   * through an underlying {@link Subject}.
   * @returns A subscription, that when unsubscribed, will "disconnect" the source from the connector subject,
   * severing notifications to all consumers.
   */
  connect(): Subscription;
}
