import { Observable } from '../Observable';
import { ObservableInput, ObservedValueOf, ReadableStreamLike } from '../types';
export declare function innerFrom<O extends ObservableInput<any>>(input: O): Observable<ObservedValueOf<O>>;
/**
 * Creates an RxJS Observable from an object that implements `Symbol.observable`.
 * @param obj An object that properly implements `Symbol.observable`.
 */
export declare function fromInteropObservable<T>(obj: any): Observable<T>;
/**
 * Synchronously emits the values of an array like and completes.
 * This is exported because there are creation functions and operators that need to
 * make direct use of the same logic, and there's no reason to make them run through
 * `from` conditionals because we *know* they're dealing with an array.
 * @param array The array to emit values from
 */
export declare function fromArrayLike<T>(array: ArrayLike<T>): Observable<T>;
export declare function fromPromise<T>(promise: PromiseLike<T>): Observable<T>;
export declare function fromIterable<T>(iterable: Iterable<T>): Observable<T>;
export declare function fromAsyncIterable<T>(asyncIterable: AsyncIterable<T>): Observable<T>;
export declare function fromReadableStreamLike<T>(readableStream: ReadableStreamLike<T>): Observable<T>;
//# sourceMappingURL=innerFrom.d.ts.map