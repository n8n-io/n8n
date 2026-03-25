Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const integration = require('../../integration.js');
const featureFlags = require('../../utils/featureFlags.js');

/**
 * Sentry integration for buffering feature flag evaluations manually with an API, and
 * capturing them on error events and spans.
 *
 * See the [feature flag documentation](https://develop.sentry.dev/sdk/expected-features/#feature-flags) for more information.
 *
 * @example
 * ```
 * import * as Sentry from '@sentry/browser';
 * import { type FeatureFlagsIntegration } from '@sentry/browser';
 *
 * // Setup
 * Sentry.init(..., integrations: [Sentry.featureFlagsIntegration()])
 *
 * // Verify
 * const flagsIntegration = Sentry.getClient()?.getIntegrationByName<FeatureFlagsIntegration>('FeatureFlags');
 * if (flagsIntegration) {
 *   flagsIntegration.addFeatureFlag('my-flag', true);
 * } else {
 *   // check your setup
 * }
 * Sentry.captureException(Exception('broke')); // 'my-flag' should be captured to this Sentry event.
 * ```
 */
const featureFlagsIntegration = integration.defineIntegration(() => {
  return {
    name: 'FeatureFlags',

    processEvent(event, _hint, _client) {
      return featureFlags._INTERNAL_copyFlagsFromScopeToEvent(event);
    },

    addFeatureFlag(name, value) {
      featureFlags._INTERNAL_insertFlagToScope(name, value);
      featureFlags._INTERNAL_addFeatureFlagToActiveSpan(name, value);
    },
  };
}) ;

exports.featureFlagsIntegration = featureFlagsIntegration;
//# sourceMappingURL=featureFlagsIntegration.js.map
