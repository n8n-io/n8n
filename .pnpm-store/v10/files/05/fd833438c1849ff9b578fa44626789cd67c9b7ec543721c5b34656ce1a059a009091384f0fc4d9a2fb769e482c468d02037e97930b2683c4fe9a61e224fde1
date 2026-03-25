Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

/**
 * This is a shim for the Unleash integration.
 * We need this in order to not throw runtime errors when accidentally importing this on the server through a meta framework like Next.js.
 */
const unleashIntegrationShim = core.defineIntegration((_options) => {
  if (!core.isBrowser()) {
    core.consoleSandbox(() => {
      // eslint-disable-next-line no-console
      console.warn('The unleashIntegration() can only be used in the browser.');
    });
  }

  return {
    name: 'Unleash',
  };
});

exports.unleashIntegrationShim = unleashIntegrationShim;
//# sourceMappingURL=unleash.js.map
