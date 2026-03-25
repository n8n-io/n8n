Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const is = require('./is.js');

/* eslint-disable */
// Vendor "Awaited" in to be TS 3.8 compatible

/**
 * Wrap a callback function with error handling.
 * If an error is thrown, it will be passed to the `onError` callback and re-thrown.
 *
 * If the return value of the function is a promise, it will be handled with `maybeHandlePromiseRejection`.
 *
 * If an `onFinally` callback is provided, this will be called when the callback has finished
 * - so if it returns a promise, once the promise resolved/rejected,
 * else once the callback has finished executing.
 * The `onFinally` callback will _always_ be called, no matter if an error was thrown or not.
 */
function handleCallbackErrors

(
  fn,
  onError,
  onFinally = () => {},
  onSuccess = () => {},
) {
  let maybePromiseResult;
  try {
    maybePromiseResult = fn();
  } catch (e) {
    onError(e);
    onFinally();
    throw e;
  }

  return maybeHandlePromiseRejection(maybePromiseResult, onError, onFinally, onSuccess);
}

/**
 * Maybe handle a promise rejection.
 * This expects to be given a value that _may_ be a promise, or any other value.
 * If it is a promise, and it rejects, it will call the `onError` callback.
 * Other than this, it will generally return the given value as-is.
 */
function maybeHandlePromiseRejection(
  value,
  onError,
  onFinally,
  onSuccess,
) {
  if (is.isThenable(value)) {
    // @ts-expect-error - the isThenable check returns the "wrong" type here
    return value.then(
      res => {
        onFinally();
        onSuccess(res);
        return res;
      },
      e => {
        onError(e);
        onFinally();
        throw e;
      },
    );
  }

  onFinally();
  onSuccess(value);
  return value;
}

exports.handleCallbackErrors = handleCallbackErrors;
//# sourceMappingURL=handleCallbackErrors.js.map
