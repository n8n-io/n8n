Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

/**
 * Sentry integration for capturing feature flag evaluations from LaunchDarkly.
 *
 * See the [feature flag documentation](https://develop.sentry.dev/sdk/expected-features/#feature-flags) for more information.
 *
 * @example
 * ```
 * import * as Sentry from '@sentry/browser';
 * import {launchDarklyIntegration, buildLaunchDarklyFlagUsedInspector} from '@sentry/browser';
 * import * as LaunchDarkly from 'launchdarkly-js-client-sdk';
 *
 * Sentry.init(..., integrations: [launchDarklyIntegration()])
 * const ldClient = LaunchDarkly.initialize(..., {inspectors: [buildLaunchDarklyFlagUsedHandler()]});
 * ```
 */
const launchDarklyIntegration = core.defineIntegration(() => {
  return {
    name: 'LaunchDarkly',

    processEvent(event, _hint, _client) {
      return core._INTERNAL_copyFlagsFromScopeToEvent(event);
    },
  };
}) ;

/**
 * LaunchDarkly hook to listen for and buffer flag evaluations. This needs to
 * be registered as an 'inspector' in LaunchDarkly initialize() options,
 * separately from `launchDarklyIntegration`. Both the hook and the integration
 * are needed to capture LaunchDarkly flags.
 */
function buildLaunchDarklyFlagUsedHandler() {
  return {
    name: 'sentry-flag-auditor',
    type: 'flag-used',

    synchronous: true,

    /**
     * Handle a flag evaluation by storing its name and value on the current scope.
     */
    method: (flagKey, flagDetail, _context) => {
      core._INTERNAL_insertFlagToScope(flagKey, flagDetail.value);
      core._INTERNAL_addFeatureFlagToActiveSpan(flagKey, flagDetail.value);
    },
  };
}

exports.buildLaunchDarklyFlagUsedHandler = buildLaunchDarklyFlagUsedHandler;
exports.launchDarklyIntegration = launchDarklyIntegration;
//# sourceMappingURL=integration.js.map
