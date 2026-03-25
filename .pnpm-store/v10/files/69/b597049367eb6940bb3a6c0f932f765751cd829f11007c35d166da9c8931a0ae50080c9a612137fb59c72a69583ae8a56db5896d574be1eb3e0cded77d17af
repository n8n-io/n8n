/**
 * Heavily simplified debounce function based on lodash.debounce.
 *
 * This function takes a callback function (@param fun) and delays its invocation
 * by @param wait milliseconds. Optionally, a maxWait can be specified in @param options,
 * which ensures that the callback is invoked at least once after the specified max. wait time.
 *
 * @param func the function whose invocation is to be debounced
 * @param wait the minimum time until the function is invoked after it was called once
 * @param options the options object, which can contain the `maxWait` property
 *
 * @returns the debounced version of the function, which needs to be called at least once to start the
 *          debouncing process. Subsequent calls will reset the debouncing timer and, in case @paramfunc
 *          was already invoked in the meantime, return @param func's return value.
 *          The debounced function has two additional properties:
 *          - `flush`: Invokes the debounced function immediately and returns its return value
 *          - `cancel`: Cancels the debouncing process and resets the debouncing timer
 */
function debounce(func, wait, options) {
  let callbackReturnValue;

  let timerId;
  let maxTimerId;

  const maxWait = options?.maxWait ? Math.max(options.maxWait, wait) : 0;
  const setTimeoutImpl = options?.setTimeoutImpl || setTimeout;

  function invokeFunc() {
    cancelTimers();
    callbackReturnValue = func();
    return callbackReturnValue;
  }

  function cancelTimers() {
    timerId !== undefined && clearTimeout(timerId);
    maxTimerId !== undefined && clearTimeout(maxTimerId);
    timerId = maxTimerId = undefined;
  }

  function flush() {
    if (timerId !== undefined || maxTimerId !== undefined) {
      return invokeFunc();
    }
    return callbackReturnValue;
  }

  function debounced() {
    if (timerId) {
      clearTimeout(timerId);
    }
    timerId = setTimeoutImpl(invokeFunc, wait);

    if (maxWait && maxTimerId === undefined) {
      maxTimerId = setTimeoutImpl(invokeFunc, maxWait);
    }

    return callbackReturnValue;
  }

  debounced.cancel = cancelTimers;
  debounced.flush = flush;
  return debounced;
}

export { debounce };
//# sourceMappingURL=debounce.js.map
