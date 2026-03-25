import { isArrayLike } from '../util/isArrayLike';
import { isPromise } from '../util/isPromise';
import { Observable } from '../Observable';
import { ObservableInput, ObservedValueOf, ReadableStreamLike } from '../types';
import { isInteropObservable } from '../util/isInteropObservable';
import { isAsyncIterable } from '../util/isAsyncIterable';
import { createInvalidObservableTypeError } from '../util/throwUnobservableError';
import { isIterable } from '../util/isIterable';
import { isReadableStreamLike, readableStreamLikeToAsyncGenerator } from '../util/isReadableStreamLike';
import { Subscriber } from '../Subscriber';
import { isFunction } from '../util/isFunction';
import { reportUnhandledError } from '../util/reportUnhandledError';
import { observable as Symbol_observable } from '../symbol/observable';

export function innerFrom<O extends ObservableInput<any>>(input: O): Observable<ObservedValueOf<O>>;
export function innerFrom<T>(input: ObservableInput<T>): Observable<T> {
  if (input instanceof Observable) {
    return input;
  }
  if (input != null) {
    if (isInteropObservable(input)) {
      return fromInteropObservable(input);
    }
    if (isArrayLike(input)) {
      return fromArrayLike(input);
    }
    if (isPromise(input)) {
      return fromPromise(input);
    }
    if (isAsyncIterable(input)) {
      return fromAsyncIterable(input);
    }
    if (isIterable(input)) {
      return fromIterable(input);
    }
    if (isReadableStreamLike(input)) {
      return fromReadableStreamLike(input);
    }
  }

  throw createInvalidObservableTypeError(input);
}

/**
 * Creates an RxJS Observable from an object that implements `Symbol.observable`.
 * @param obj An object that properly implements `Symbol.observable`.
 */
export function fromInteropObservable<T>(obj: any) {
  return new Observable((subscriber: Subscriber<T>) => {
    const obs = obj[Symbol_observable]();
    if (isFunction(obs.subscribe)) {
      return obs.subscribe(subscriber);
    }
    // Should be caught by observable subscribe function error handling.
    throw new TypeError('Provided object does not correctly implement Symbol.observable');
  });
}

/**
 * Synchronously emits the values of an array like and completes.
 * This is exported because there are creation functions and operators that need to
 * make direct use of the same logic, and there's no reason to make them run through
 * `from` conditionals because we *know* they're dealing with an array.
 * @param array The array to emit values from
 */
export function fromArrayLike<T>(array: ArrayLike<T>) {
  return new Observable((subscriber: Subscriber<T>) => {
    // Loop over the array and emit each value. Note two things here:
    // 1. We're making sure that the subscriber is not closed on each loop.
    //    This is so we don't continue looping over a very large array after
    //    something like a `take`, `takeWhile`, or other synchronous unsubscription
    //    has already unsubscribed.
    // 2. In this form, reentrant code can alter that array we're looping over.
    //    This is a known issue, but considered an edge case. The alternative would
    //    be to copy the array before executing the loop, but this has
    //    performance implications.
    for (let i = 0; i < array.length && !subscriber.closed; i++) {
      subscriber.next(array[i]);
    }
    subscriber.complete();
  });
}

export function fromPromise<T>(promise: PromiseLike<T>) {
  return new Observable((subscriber: Subscriber<T>) => {
    promise
      .then(
        (value) => {
          if (!subscriber.closed) {
            subscriber.next(value);
            subscriber.complete();
          }
        },
        (err: any) => subscriber.error(err)
      )
      .then(null, reportUnhandledError);
  });
}

export function fromIterable<T>(iterable: Iterable<T>) {
  return new Observable((subscriber: Subscriber<T>) => {
    for (const value of iterable) {
      subscriber.next(value);
      if (subscriber.closed) {
        return;
      }
    }
    subscriber.complete();
  });
}

export function fromAsyncIterable<T>(asyncIterable: AsyncIterable<T>) {
  return new Observable((subscriber: Subscriber<T>) => {
    process(asyncIterable, subscriber).catch((err) => subscriber.error(err));
  });
}

export function fromReadableStreamLike<T>(readableStream: ReadableStreamLike<T>) {
  return fromAsyncIterable(readableStreamLikeToAsyncGenerator(readableStream));
}

async function process<T>(asyncIterable: AsyncIterable<T>, subscriber: Subscriber<T>) {
  for await (const value of asyncIterable) {
    subscriber.next(value);
    // A side-effect may have closed our subscriber,
    // check before the next iteration.
    if (subscriber.closed) {
      return;
    }
  }
  subscriber.complete();
}
