import { DEBUG_BUILD } from '../debug-build.js';
import { debug } from '../utils/debug-logger.js';
import { getFunctionName } from '../utils/stacktrace.js';

// We keep the handlers globally
const handlers = {};
const instrumented = {};

/** Add a handler function. */
function addHandler(type, handler) {
  handlers[type] = handlers[type] || [];
  handlers[type].push(handler);
}

/**
 * Reset all instrumentation handlers.
 * This can be used by tests to ensure we have a clean slate of instrumentation handlers.
 */
function resetInstrumentationHandlers() {
  Object.keys(handlers).forEach(key => {
    handlers[key ] = undefined;
  });
}

/** Maybe run an instrumentation function, unless it was already called. */
function maybeInstrument(type, instrumentFn) {
  if (!instrumented[type]) {
    instrumented[type] = true;
    try {
      instrumentFn();
    } catch (e) {
      DEBUG_BUILD && debug.error(`Error while instrumenting ${type}`, e);
    }
  }
}

/** Trigger handlers for a given instrumentation type. */
function triggerHandlers(type, data) {
  const typeHandlers = type && handlers[type];
  if (!typeHandlers) {
    return;
  }

  for (const handler of typeHandlers) {
    try {
      handler(data);
    } catch (e) {
      DEBUG_BUILD &&
        debug.error(
          `Error while triggering instrumentation handler.\nType: ${type}\nName: ${getFunctionName(handler)}\nError:`,
          e,
        );
    }
  }
}

export { addHandler, maybeInstrument, resetInstrumentationHandlers, triggerHandlers };
//# sourceMappingURL=handlers.js.map
