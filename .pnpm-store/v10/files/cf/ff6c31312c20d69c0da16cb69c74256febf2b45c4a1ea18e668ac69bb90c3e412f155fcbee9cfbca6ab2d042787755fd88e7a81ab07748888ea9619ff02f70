// Extracted from p-timeout https://github.com/sindresorhus/p-timeout
// as it is not commonjs compatible. This is version 5.0.2
'use strict';

class TimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TimeoutError';
  }
}

module.exports.TimeoutError = TimeoutError;

module.exports.pTimeout = function pTimeout(
  promise,
  milliseconds,
  fallback,
  options
) {
  let timer;
  const cancelablePromise = new Promise((resolve, reject) => {
    if (typeof milliseconds !== 'number' || Math.sign(milliseconds) !== 1) {
      throw new TypeError(
        `Expected \`milliseconds\` to be a positive number, got \`${milliseconds}\``
      );
    }

    if (milliseconds === Number.POSITIVE_INFINITY) {
      resolve(promise);
      return;
    }

    options = {
      customTimers: { setTimeout, clearTimeout },
      ...options
    };

    timer = options.customTimers.setTimeout.call(
      undefined,
      () => {
        if (typeof fallback === 'function') {
          try {
            resolve(fallback());
          } catch (error) {
            reject(error);
          }

          return;
        }

        const message =
          typeof fallback === 'string'
            ? fallback
            : `Promise timed out after ${milliseconds} milliseconds`;
        const timeoutError =
          fallback instanceof Error ? fallback : new TimeoutError(message);

        if (typeof promise.cancel === 'function') {
          promise.cancel();
        }

        reject(timeoutError);
      },
      milliseconds
    );

    (async () => {
      try {
        resolve(await promise);
      } catch (error) {
        reject(error);
      } finally {
        options.customTimers.clearTimeout.call(undefined, timer);
      }
    })();
  });

  cancelablePromise['clear'] = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  return cancelablePromise;
};
