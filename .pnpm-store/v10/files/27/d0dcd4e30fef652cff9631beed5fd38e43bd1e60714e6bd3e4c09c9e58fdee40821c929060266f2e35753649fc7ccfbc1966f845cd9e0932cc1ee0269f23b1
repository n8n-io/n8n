Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const chainAndCopyPromiselike = require('./chain-and-copy-promiselike.js');
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
 *
 * For thenable objects with extra methods (like jQuery's jqXHR),
 * this function preserves those methods by wrapping the original thenable in a Proxy
 * that intercepts .then() calls to apply error handling while forwarding all other
 * properties to the original object.
 * This allows code like `startSpan(() => $.ajax(...)).abort()` to work correctly.
 */
function maybeHandlePromiseRejection(
  value,
  onError,
  onFinally,
  onSuccess,
) {
  if (is.isThenable(value)) {
    return chainAndCopyPromiselike.chainAndCopyPromiseLike(
      value ,
      result => {
        onFinally();
        onSuccess(result );
      },
      err => {
        onError(err);
        onFinally();
      },
    ) ;
  }
  // Non-thenable value - call callbacks immediately and return as-is
  onFinally();
  onSuccess(value);
  return value;
}

exports.handleCallbackErrors = handleCallbackErrors;
//# sourceMappingURL=handleCallbackErrors.js.map
