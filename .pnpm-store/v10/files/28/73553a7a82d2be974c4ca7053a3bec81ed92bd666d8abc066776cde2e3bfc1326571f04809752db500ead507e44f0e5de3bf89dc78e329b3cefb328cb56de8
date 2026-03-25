Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const currentScopes = require('./currentScopes.js');
const debugBuild = require('./debug-build.js');
const debugLogger = require('./utils/debug-logger.js');

/** A class object that can instantiate Client objects. */

/**
 * Internal function to create a new SDK client instance. The client is
 * installed and then bound to the current scope.
 *
 * @param clientClass The client class to instantiate.
 * @param options Options to pass to the client.
 */
function initAndBind(
  clientClass,
  options,
) {
  if (options.debug === true) {
    if (debugBuild.DEBUG_BUILD) {
      debugLogger.debug.enable();
    } else {
      // use `console.warn` rather than `debug.warn` since by non-debug bundles have all `debug.x` statements stripped
      debugLogger.consoleSandbox(() => {
        // eslint-disable-next-line no-console
        console.warn('[Sentry] Cannot initialize SDK with `debug` option using a non-debug bundle.');
      });
    }
  }
  const scope = currentScopes.getCurrentScope();
  scope.update(options.initialScope);

  const client = new clientClass(options);
  setCurrentClient(client);
  client.init();
  return client;
}

/**
 * Make the given client the current client.
 */
function setCurrentClient(client) {
  currentScopes.getCurrentScope().setClient(client);
}

exports.initAndBind = initAndBind;
exports.setCurrentClient = setCurrentClient;
//# sourceMappingURL=sdk.js.map
