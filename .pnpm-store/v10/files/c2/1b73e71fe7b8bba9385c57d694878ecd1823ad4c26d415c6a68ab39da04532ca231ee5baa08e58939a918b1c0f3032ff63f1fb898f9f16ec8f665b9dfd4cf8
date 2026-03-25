Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const types = require('../types.js');

let lastHref;

/**
 * Add an instrumentation handler for when a fetch request happens.
 * The handler function is called once when the request starts and once when it ends,
 * which can be identified by checking if it has an `endTimestamp`.
 *
 * Use at your own risk, this might break without changelog notice, only used internally.
 * @hidden
 */
function addHistoryInstrumentationHandler(handler) {
  const type = 'history';
  core.addHandler(type, handler);
  core.maybeInstrument(type, instrumentHistory);
}

/**
 * Exported just for testing
 */
function instrumentHistory() {
  // The `popstate` event may also be triggered on `pushState`, but it may not always reliably be emitted by the browser
  // Which is why we also monkey-patch methods below, in addition to this
  types.WINDOW.addEventListener('popstate', () => {
    const to = types.WINDOW.location.href;
    // keep track of the current URL state, as we always receive only the updated state
    const from = lastHref;
    lastHref = to;

    if (from === to) {
      return;
    }

    const handlerData = { from, to } ;
    core.triggerHandlers('history', handlerData);
  });

  // Just guard against this not being available, in weird environments
  if (!core.supportsHistory()) {
    return;
  }

  function historyReplacementFunction(originalHistoryFunction) {
    return function ( ...args) {
      const url = args.length > 2 ? args[2] : undefined;
      if (url) {
        const from = lastHref;

        // Ensure the URL is absolute
        // this can be either a path, then it is relative to the current origin
        // or a full URL of the current origin - other origins are not allowed
        // See: https://developer.mozilla.org/en-US/docs/Web/API/History/pushState#url
        // coerce to string (this is what pushState does)
        const to = getAbsoluteUrl(String(url));

        // keep track of the current URL state, as we always receive only the updated state
        lastHref = to;

        if (from === to) {
          return originalHistoryFunction.apply(this, args);
        }

        const handlerData = { from, to } ;
        core.triggerHandlers('history', handlerData);
      }
      return originalHistoryFunction.apply(this, args);
    };
  }

  core.fill(types.WINDOW.history, 'pushState', historyReplacementFunction);
  core.fill(types.WINDOW.history, 'replaceState', historyReplacementFunction);
}

function getAbsoluteUrl(urlOrPath) {
  try {
    const url = new URL(urlOrPath, types.WINDOW.location.origin);
    return url.toString();
  } catch {
    // fallback, just do nothing
    return urlOrPath;
  }
}

exports.addHistoryInstrumentationHandler = addHistoryInstrumentationHandler;
exports.instrumentHistory = instrumentHistory;
//# sourceMappingURL=history.js.map
