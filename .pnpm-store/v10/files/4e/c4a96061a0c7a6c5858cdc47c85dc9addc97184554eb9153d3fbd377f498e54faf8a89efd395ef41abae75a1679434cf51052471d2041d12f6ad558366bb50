import { config } from '../config';
import { timeoutProvider } from '../scheduler/timeoutProvider';

/**
 * Handles an error on another job either with the user-configured {@link onUnhandledError},
 * or by throwing it on that new job so it can be picked up by `window.onerror`, `process.on('error')`, etc.
 *
 * This should be called whenever there is an error that is out-of-band with the subscription
 * or when an error hits a terminal boundary of the subscription and no error handler was provided.
 *
 * @param err the error to report
 */
export function reportUnhandledError(err: any) {
  timeoutProvider.setTimeout(() => {
    const { onUnhandledError } = config;
    if (onUnhandledError) {
      // Execute the user-configured error handler.
      onUnhandledError(err);
    } else {
      // Throw so it is picked up by the runtime's uncaught error mechanism.
      throw err;
    }
  });
}
