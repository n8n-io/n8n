Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

/**
 * This is a shim for the LaunchDarkly integration.
 * We need this in order to not throw runtime errors when accidentally importing this on the server through a meta framework like Next.js.
 */
const launchDarklyIntegrationShim = core.defineIntegration((_options) => {
  if (!core.isBrowser()) {
    core.consoleSandbox(() => {
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
  if (!core.isBrowser()) {
    core.consoleSandbox(() => {
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

exports.buildLaunchDarklyFlagUsedHandlerShim = buildLaunchDarklyFlagUsedHandlerShim;
exports.launchDarklyIntegrationShim = launchDarklyIntegrationShim;
//# sourceMappingURL=launchDarkly.js.map
