Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const debugBuild = require('../debug-build.js');
const globalError = require('../instrument/globalError.js');
const globalUnhandledRejection = require('../instrument/globalUnhandledRejection.js');
const debugLogger = require('../utils/debug-logger.js');
const spanUtils = require('../utils/spanUtils.js');
const spanstatus = require('./spanstatus.js');

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
    const activeSpan = spanUtils.getActiveSpan();
    const rootSpan = activeSpan && spanUtils.getRootSpan(activeSpan);
    if (rootSpan) {
      const message = 'internal_error';
      debugBuild.DEBUG_BUILD && debugLogger.debug.log(`[Tracing] Root span: ${message} -> Global error occurred`);
      rootSpan.setStatus({ code: spanstatus.SPAN_STATUS_ERROR, message });
    }
  }

  // The function name will be lost when bundling but we need to be able to identify this listener later to maintain the
  // node.js default exit behaviour
  errorCallback.tag = 'sentry_tracingErrorCallback';

  errorsInstrumented = true;
  globalError.addGlobalErrorInstrumentationHandler(errorCallback);
  globalUnhandledRejection.addGlobalUnhandledRejectionInstrumentationHandler(errorCallback);
}

exports.registerSpanErrorInstrumentation = registerSpanErrorInstrumentation;
//# sourceMappingURL=errors.js.map
