import { DEBUG_BUILD } from '../debug-build.js';
import { addGlobalErrorInstrumentationHandler } from '../instrument/globalError.js';
import { addGlobalUnhandledRejectionInstrumentationHandler } from '../instrument/globalUnhandledRejection.js';
import { debug } from '../utils/debug-logger.js';
import { getActiveSpan, getRootSpan } from '../utils/spanUtils.js';
import { SPAN_STATUS_ERROR } from './spanstatus.js';

let errorsInstrumented = false;

/**
 * Ensure that global errors automatically set the active span status.
 */
function registerSpanErrorInstrumentation() {
  if (errorsInstrumented) {
    return;
  }

  /**
   * If an error or unhandled promise occurs, we mark the active root span as failed
   */
  function errorCallback() {
    const activeSpan = getActiveSpan();
    const rootSpan = activeSpan && getRootSpan(activeSpan);
    if (rootSpan) {
      const message = 'internal_error';
      DEBUG_BUILD && debug.log(`[Tracing] Root span: ${message} -> Global error occurred`);
      rootSpan.setStatus({ code: SPAN_STATUS_ERROR, message });
    }
  }

  // The function name will be lost when bundling but we need to be able to identify this listener later to maintain the
  // node.js default exit behaviour
  errorCallback.tag = 'sentry_tracingErrorCallback';

  errorsInstrumented = true;
  addGlobalErrorInstrumentationHandler(errorCallback);
  addGlobalUnhandledRejectionInstrumentationHandler(errorCallback);
}

export { registerSpanErrorInstrumentation };
//# sourceMappingURL=errors.js.map
