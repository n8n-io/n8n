import { defineIntegration, isBrowser, consoleSandbox } from '@sentry/core';

/**
 * This is a shim for the Unleash integration.
 * We need this in order to not throw runtime errors when accidentally importing this on the server through a meta framework like Next.js.
 */
const unleashIntegrationShim = defineIntegration((_options) => {
  if (!isBrowser()) {
    consoleSandbox(() => {
      // eslint-disable-next-line no-console
      console.warn('The unleashIntegration() can only be used in the browser.');
    });
  }

  return {
    name: 'Unleash',
  };
});

export { unleashIntegrationShim };
//# sourceMappingURL=unleash.js.map
