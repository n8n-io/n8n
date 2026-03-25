import { GLOBAL_OBJ } from '../utils/worldwide.js';
import { addHandler, maybeInstrument, triggerHandlers } from './handlers.js';

let _oldOnErrorHandler = null;

/**
 * Add an instrumentation handler for when an error is captured by the global error handler.
 *
 * Use at your own risk, this might break without changelog notice, only used internally.
 * @hidden
 */
function addGlobalErrorInstrumentationHandler(handler) {
  const type = 'error';
  addHandler(type, handler);
  maybeInstrument(type, instrumentError);
}

function instrumentError() {
  _oldOnErrorHandler = GLOBAL_OBJ.onerror;

  // Note: The reason we are doing window.onerror instead of window.addEventListener('error')
  // is that we are using this handler in the Loader Script, to handle buffered errors consistently
  GLOBAL_OBJ.onerror = function (
    msg,
    url,
    line,
    column,
    error,
  ) {
    const handlerData = {
      column,
      error,
      line,
      msg,
      url,
    };
    triggerHandlers('error', handlerData);

    if (_oldOnErrorHandler) {
      // eslint-disable-next-line prefer-rest-params
      return _oldOnErrorHandler.apply(this, arguments);
    }

    return false;
  };

  GLOBAL_OBJ.onerror.__SENTRY_INSTRUMENTED__ = true;
}

export { addGlobalErrorInstrumentationHandler };
//# sourceMappingURL=globalError.js.map
