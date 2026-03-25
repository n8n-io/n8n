import { getClient } from '../currentScopes.js';
import { defineIntegration } from '../integration.js';
import { getOriginalFunction } from '../utils/object.js';

let originalFunctionToString;

const INTEGRATION_NAME = 'FunctionToString';

const SETUP_CLIENTS = new WeakMap();

const _functionToStringIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      originalFunctionToString = Function.prototype.toString;

      // intrinsics (like Function.prototype) might be immutable in some environments
      // e.g. Node with --frozen-intrinsics, XS (an embedded JavaScript engine) or SES (a JavaScript proposal)
      try {
        Function.prototype.toString = function ( ...args) {
          const originalFunction = getOriginalFunction(this);
          const context =
            SETUP_CLIENTS.has(getClient() ) && originalFunction !== undefined ? originalFunction : this;
          return originalFunctionToString.apply(context, args);
        };
      } catch {
        // ignore errors here, just don't patch this
      }
    },
    setup(client) {
      SETUP_CLIENTS.set(client, true);
    },
  };
}) ;

/**
 * Patch toString calls to return proper name for wrapped functions.
 *
 * ```js
 * Sentry.init({
 *   integrations: [
 *     functionToStringIntegration(),
 *   ],
 * });
 * ```
 */
const functionToStringIntegration = defineIntegration(_functionToStringIntegration);

export { functionToStringIntegration };
//# sourceMappingURL=functiontostring.js.map
