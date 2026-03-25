Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

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
const statsigIntegration = core.defineIntegration(
  ({ featureFlagClient: statsigClient }) => {
    return {
      name: 'Statsig',

      setup(_client) {
        statsigClient.on('gate_evaluation', (event) => {
          core._INTERNAL_insertFlagToScope(event.gate.name, event.gate.value);
          core._INTERNAL_addFeatureFlagToActiveSpan(event.gate.name, event.gate.value);
        });
      },

      processEvent(event, _hint, _client) {
        return core._INTERNAL_copyFlagsFromScopeToEvent(event);
      },
    };
  },
) ;

exports.statsigIntegration = statsigIntegration;
//# sourceMappingURL=integration.js.map
