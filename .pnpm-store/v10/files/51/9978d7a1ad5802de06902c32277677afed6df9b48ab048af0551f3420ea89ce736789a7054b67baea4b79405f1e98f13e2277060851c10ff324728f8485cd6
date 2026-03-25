Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

/**
 * This is a shim for the OpenFeature integration.
 * We need this in order to not throw runtime errors when accidentally importing this on the server through a meta framework like Next.js.
 */
const openFeatureIntegrationShim = core.defineIntegration((_options) => {
  if (!core.isBrowser()) {
    core.consoleSandbox(() => {
      // eslint-disable-next-line no-console
      console.warn('The openFeatureIntegration() can only be used in the browser.');
    });
  }

  return {
    name: 'OpenFeature',
  };
});

/**
 * This is a shim for the OpenFeature integration hook.
 */
class OpenFeatureIntegrationHookShim {
  /**
   *
   */
   constructor() {
    if (!core.isBrowser()) {
      core.consoleSandbox(() => {
        // eslint-disable-next-line no-console
        console.warn('The OpenFeatureIntegrationHook can only be used in the browser.');
      });
    }
  }

  /**
   *
   */
   after() {
    // No-op
  }

  /**
   *
   */
   error() {
    // No-op
  }
}

exports.OpenFeatureIntegrationHookShim = OpenFeatureIntegrationHookShim;
exports.openFeatureIntegrationShim = openFeatureIntegrationShim;
//# sourceMappingURL=openFeature.js.map
