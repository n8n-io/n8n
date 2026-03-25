import { defineIntegration, isBrowser, consoleSandbox } from '@sentry/core';

/**
 * This is a shim for the Statsig integration.
 * We need this in order to not throw runtime errors when accidentally importing this on the server through a meta framework like Next.js.
 */
const statsigIntegrationShim = defineIntegration((_options) => {
  if (!isBrowser()) {
    consoleSandbox(() => {
      // eslint-disable-next-line no-console
      console.warn('The statsigIntegration() can only be used in the browser.');
    });
  }

  return {
    name: 'Statsig',
  };
});

export { statsigIntegrationShim };
//# sourceMappingURL=statsig.js.map
