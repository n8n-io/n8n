import { GLOBAL_OBJ } from '../utils/worldwide.js';
import { addHandler, maybeInstrument, triggerHandlers } from './handlers.js';

let _oldOnUnhandledRejectionHandler = null;

/**
 * Add an instrumentation handler for when an unhandled promise rejection is captured.
 *
 * Use at your own risk, this might break without changelog notice, only used internally.
 * @hidden
 */
function addGlobalUnhandledRejectionInstrumentationHandler(
  handler,
) {
  const type = 'unhandledrejection';
  addHandler(type, handler);
  maybeInstrument(type, instrumentUnhandledRejection);
}

function instrumentUnhandledRejection() {
  _oldOnUnhandledRejectionHandler = GLOBAL_OBJ.onunhandledrejection;

  // Note: The reason we are doing window.onunhandledrejection instead of window.addEventListener('unhandledrejection')
  // is that we are using this handler in the Loader Script, to handle buffered rejections consistently
  GLOBAL_OBJ.onunhandledrejection = function (e) {
    const handlerData = e;
    triggerHandlers('unhandledrejection', handlerData);

    if (_oldOnUnhandledRejectionHandler) {
      // eslint-disable-next-line prefer-rest-params
      return _oldOnUnhandledRejectionHandler.apply(this, arguments);
    }

    return true;
  };

  GLOBAL_OBJ.onunhandledrejection.__SENTRY_INSTRUMENTED__ = true;
}

export { addGlobalUnhandledRejectionInstrumentationHandler };
//# sourceMappingURL=globalUnhandledRejection.js.map
