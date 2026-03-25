import type { StatsigClient } from './types';
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
export declare const statsigIntegration: (args_0: {
    featureFlagClient: StatsigClient;
}) => import("@sentry/core").Integration;
//# sourceMappingURL=integration.d.ts.map