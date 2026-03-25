Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const worldwide = require('../utils/worldwide.js');
const handlers = require('./handlers.js');

let _oldOnErrorHandler = null;

/**
 * Add an instrumentation handler for when an error is captured by the global error handler.
 *
 * Use at your own risk, this might break without changelog notice, only used internally.
 * @hidden
 */
function addGlobalErrorInstrumentationHandler(handler) {
  const type = 'error';
  handlers.addHandler(type, handler);
  handlers.maybeInstrument(type, instrumentError);
}

function instrumentError() {
  _oldOnErrorHandler = worldwide.GLOBAL_OBJ.onerror;

  // Note: The reason we are doing window.onerror instead of window.addEventListener('error')
  // is that we are using this handler in the Loader Script, to handle buffered errors consistently
  worldwide.GLOBAL_OBJ.onerror = function (
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
    handlers.triggerHandlers('error', handlerData);

    if (_oldOnErrorHandler) {
      // eslint-disable-next-line prefer-rest-params
      return _oldOnErrorHandler.apply(this, arguments);
    }

    return false;
  };

  worldwide.GLOBAL_OBJ.onerror.__SENTRY_INSTRUMENTED__ = true;
}

exports.addGlobalErrorInstrumentationHandler = addGlobalErrorInstrumentationHandler;
//# sourceMappingURL=globalError.js.map
