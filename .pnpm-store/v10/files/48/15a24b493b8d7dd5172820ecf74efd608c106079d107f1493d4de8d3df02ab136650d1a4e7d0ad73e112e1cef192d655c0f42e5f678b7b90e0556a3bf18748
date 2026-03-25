import { UnleashClientClass } from './types';
type UnleashIntegrationOptions = {
    featureFlagClientClass: UnleashClientClass;
};
/**
 * Sentry integration for capturing feature flag evaluations from the Unleash SDK.
 *
 * See the [feature flag documentation](https://develop.sentry.dev/sdk/expected-features/#feature-flags) for more information.
 *
 * @example
 * ```
 * import { UnleashClient } from 'unleash-proxy-client';
 * import * as Sentry from '@sentry/browser';
 *
 * Sentry.init({
 *   dsn: '___PUBLIC_DSN___',
 *   integrations: [Sentry.unleashIntegration({featureFlagClientClass: UnleashClient})],
 * });
 *
 * const unleash = new UnleashClient(...);
 * unleash.start();
 *
 * unleash.isEnabled('my-feature');
 * Sentry.captureException(new Error('something went wrong'));
 * ```
 */
export declare const unleashIntegration: (args_0: UnleashIntegrationOptions) => import("@sentry/core").Integration;
export {};
//# sourceMappingURL=integration.d.ts.map
