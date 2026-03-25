Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('../../../debug-build.js');

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
const unleashIntegration = core.defineIntegration(
  ({ featureFlagClientClass: unleashClientClass }) => {
    return {
      name: 'Unleash',

      setupOnce() {
        const unleashClientPrototype = unleashClientClass.prototype ;
        core.fill(unleashClientPrototype, 'isEnabled', _wrappedIsEnabled);
      },

      processEvent(event, _hint, _client) {
        return core._INTERNAL_copyFlagsFromScopeToEvent(event);
      },
    };
  },
) ;

/**
 * Wraps the UnleashClient.isEnabled method to capture feature flag evaluations. Its only side effect is writing to Sentry scope.
 *
 * This wrapper is safe for all isEnabled signatures. If the signature does not match (this: UnleashClient, toggleName: string, ...args: unknown[]) => boolean,
 * we log an error and return the original result.
 *
 * @param original - The original method.
 * @returns Wrapped method. Results should match the original.
 */
function _wrappedIsEnabled(
  original,
) {
  return function ( ...args) {
    const toggleName = args[0];
    const result = original.apply(this, args);

    if (typeof toggleName === 'string' && typeof result === 'boolean') {
      core._INTERNAL_insertFlagToScope(toggleName, result);
      core._INTERNAL_addFeatureFlagToActiveSpan(toggleName, result);
    } else if (debugBuild.DEBUG_BUILD) {
      core.debug.error(
        `[Feature Flags] UnleashClient.isEnabled does not match expected signature. arg0: ${toggleName} (${typeof toggleName}), result: ${result} (${typeof result})`,
      );
    }
    return result;
  };
}

exports.unleashIntegration = unleashIntegration;
//# sourceMappingURL=integration.js.map
