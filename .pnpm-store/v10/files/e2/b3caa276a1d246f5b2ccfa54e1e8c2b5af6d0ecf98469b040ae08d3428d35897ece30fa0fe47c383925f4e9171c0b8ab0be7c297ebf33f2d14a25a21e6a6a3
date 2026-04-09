import { ErrorHandler } from './error-handler';

/**
 * Creates a Promise with externally accessible resolve and reject functions.
 *
 * @template T - The type of the value that the Promise will resolve to.
 * @returns An object containing:
 *   - promise: A Promise that can be resolved or rejected externally.
 *   - resolve: A function to resolve the Promise with a value of type T.
 *   - reject: A function to reject the Promise with an error.
 */
export function createResolvablePromise<T = any>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: ErrorHandler;
} {
  let resolve: (value: T) => void;
  let reject: ErrorHandler;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}
