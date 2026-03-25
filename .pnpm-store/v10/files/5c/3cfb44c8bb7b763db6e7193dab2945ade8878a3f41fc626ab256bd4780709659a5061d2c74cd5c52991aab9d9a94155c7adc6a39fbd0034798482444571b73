Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

/**
 * Sentry integration for capturing feature flag evaluations from GrowthBook.
 *
 * See the feature flag documentation: https://develop.sentry.dev/sdk/expected-features/#feature-flags
 *
 * @example
 * ```
 * import { GrowthBook } from '@growthbook/growthbook';
 * import * as Sentry from '@sentry/browser';
 *
 * Sentry.init({
 *   dsn: '___PUBLIC_DSN___',
 *   integrations: [Sentry.growthbookIntegration({ growthbookClass: GrowthBook })],
 * });
 *
 * const gb = new GrowthBook();
 * gb.isOn('my-feature');
 * Sentry.captureException(new Error('something went wrong'));
 * ```
 */
const growthbookIntegration = (({ growthbookClass }) =>
  core.growthbookIntegration({ growthbookClass })) ;

exports.growthbookIntegration = growthbookIntegration;
//# sourceMappingURL=integration.js.map
