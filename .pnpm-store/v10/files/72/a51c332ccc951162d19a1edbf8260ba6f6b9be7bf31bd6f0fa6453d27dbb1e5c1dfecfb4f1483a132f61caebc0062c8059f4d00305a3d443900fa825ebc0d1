import { defineIntegration, _INTERNAL_copyFlagsFromScopeToEvent, _INTERNAL_insertFlagToScope, _INTERNAL_addFeatureFlagToActiveSpan } from '@sentry/core';

/**
 * Sentry integration for capturing feature flag evaluations from the Statsig js-client SDK.
 *
 * See the [feature flag documentation](https://develop.sentry.dev/sdk/expected-features/#feature-flags) for more information.
 *
 * @example
 * ```
 * import { StatsigClient } from '@statsig/js-client';
 * import * as Sentry from '@sentry/browser';
 *
 * const statsigClient = new StatsigClient();
 *
 * Sentry.init({
 *   dsn: '___PUBLIC_DSN___',
 *   integrations: [Sentry.statsigIntegration({featureFlagClient: statsigClient})],
 * });
 *
 * await statsigClient.initializeAsync();  // or statsigClient.initializeSync();
 *
 * const result = statsigClient.checkGate('my-feature-gate');
 * Sentry.captureException(new Error('something went wrong'));
 * ```
 */
const statsigIntegration = defineIntegration(
  ({ featureFlagClient: statsigClient }) => {
    return {
      name: 'Statsig',

      setup(_client) {
        statsigClient.on('gate_evaluation', (event) => {
          _INTERNAL_insertFlagToScope(event.gate.name, event.gate.value);
          _INTERNAL_addFeatureFlagToActiveSpan(event.gate.name, event.gate.value);
        });
      },

      processEvent(event, _hint, _client) {
        return _INTERNAL_copyFlagsFromScopeToEvent(event);
      },
    };
  },
) ;

export { statsigIntegration };
//# sourceMappingURL=integration.js.map
