Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

/**
 * This is a shim for the Statsig integration.
 * We need this in order to not throw runtime errors when accidentally importing this on the server through a meta framework like Next.js.
 */
const statsigIntegrationShim = core.defineIntegration((_options) => {
  if (!core.isBrowser()) {
    core.consoleSandbox(() => {
      // eslint-disable-next-line no-console
      console.warn('The statsigIntegration() can only be used in the browser.');
    });
  }

  return {
    name: 'Statsig',
  };
});

exports.statsigIntegrationShim = statsigIntegrationShim;
//# sourceMappingURL=statsig.js.map
