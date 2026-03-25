Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const carrier = require('../carrier.js');
const stackStrategy = require('./stackStrategy.js');

/**
 * @private Private API with no semver guarantees!
 *
 * Sets the global async context strategy
 */
function setAsyncContextStrategy(strategy) {
  // Get main carrier (global for every environment)
  const registry = carrier.getMainCarrier();
  const sentry = carrier.getSentryCarrier(registry);
  sentry.acs = strategy;
}

/**
 * Get the current async context strategy.
 * If none has been setup, the default will be used.
 */
function getAsyncContextStrategy(carrier$1) {
  const sentry = carrier.getSentryCarrier(carrier$1);

  if (sentry.acs) {
    return sentry.acs;
  }

  // Otherwise, use the default one (stack)
  return stackStrategy.getStackAsyncContextStrategy();
}

exports.getAsyncContextStrategy = getAsyncContextStrategy;
exports.setAsyncContextStrategy = setAsyncContextStrategy;
//# sourceMappingURL=index.js.map
