import { defineIntegration, _INTERNAL_copyFlagsFromScopeToEvent, _INTERNAL_insertFlagToScope, _INTERNAL_addFeatureFlagToActiveSpan } from '@sentry/core';

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
const launchDarklyIntegration = defineIntegration(() => {
  return {
    name: 'LaunchDarkly',

    processEvent(event, _hint, _client) {
      return _INTERNAL_copyFlagsFromScopeToEvent(event);
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
      _INTERNAL_insertFlagToScope(flagKey, flagDetail.value);
      _INTERNAL_addFeatureFlagToActiveSpan(flagKey, flagDetail.value);
    },
  };
}

export { buildLaunchDarklyFlagUsedHandler, launchDarklyIntegration };
//# sourceMappingURL=integration.js.map
