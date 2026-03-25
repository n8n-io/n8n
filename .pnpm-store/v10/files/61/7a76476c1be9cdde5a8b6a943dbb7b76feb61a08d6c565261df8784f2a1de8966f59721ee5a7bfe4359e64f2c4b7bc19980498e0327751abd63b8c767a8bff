import { config } from '../config';

let context: { errorThrown: boolean; error: any } | null = null;

/**
 * Handles dealing with errors for super-gross mode. Creates a context, in which
 * any synchronously thrown errors will be passed to {@link captureError}. Which
 * will record the error such that it will be rethrown after the call back is complete.
 * TODO: Remove in v8
 * @param cb An immediately executed function.
 */
export function errorContext(cb: () => void) {
  if (config.useDeprecatedSynchronousErrorHandling) {
    const isRoot = !context;
    if (isRoot) {
      context = { errorThrown: false, error: null };
    }
    cb();
    if (isRoot) {
      const { errorThrown, error } = context!;
      context = null;
      if (errorThrown) {
        throw error;
      }
    }
  } else {
    // This is the general non-deprecated path for everyone that
    // isn't crazy enough to use super-gross mode (useDeprecatedSynchronousErrorHandling)
    cb();
  }
}

/**
 * Captures errors only in super-gross mode.
 * @param err the error to capture
 */
export function captureError(err: any) {
  if (config.useDeprecatedSynchronousErrorHandling && context) {
    context.errorThrown = true;
    context.error = err;
  }
}
