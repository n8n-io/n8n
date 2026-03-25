import { defineIntegration, isBrowser, consoleSandbox } from '@sentry/core';

/**
 * This is a shim for the LaunchDarkly integration.
 * We need this in order to not throw runtime errors when accidentally importing this on the server through a meta framework like Next.js.
 */
const launchDarklyIntegrationShim = defineIntegration((_options) => {
  if (!isBrowser()) {
    consoleSandbox(() => {
      // eslint-disable-next-line no-console
      console.warn('The launchDarklyIntegration() can only be used in the browser.');
    });
  }

  return {
    name: 'LaunchDarkly',
  };
});

/**
 * This is a shim for the LaunchDarkly flag used handler.
 */
function buildLaunchDarklyFlagUsedHandlerShim() {
  if (!isBrowser()) {
    consoleSandbox(() => {
      // eslint-disable-next-line no-console
      console.warn('The buildLaunchDarklyFlagUsedHandler() can only be used in the browser.');
    });
  }

  return {
    name: 'sentry-flag-auditor',
    type: 'flag-used',
    synchronous: true,
    method: () => null,
  };
}

export { buildLaunchDarklyFlagUsedHandlerShim, launchDarklyIntegrationShim };
//# sourceMappingURL=launchDarkly.js.map
