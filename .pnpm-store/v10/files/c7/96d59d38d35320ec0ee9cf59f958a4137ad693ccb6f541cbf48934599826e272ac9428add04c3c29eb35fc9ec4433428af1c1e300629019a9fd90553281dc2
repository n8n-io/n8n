Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const integration = require('../../integration.js');
const featureFlags = require('../../utils/featureFlags.js');
const object = require('../../utils/object.js');

/**
 * Sentry integration for capturing feature flag evaluations from GrowthBook.
 *
 * Only boolean results are captured at this time.
 *
 * @example
 * ```typescript
 * import { GrowthBook } from '@growthbook/growthbook';
 * import * as Sentry from '@sentry/browser'; // or '@sentry/node'
 *
 * Sentry.init({
 *   dsn: 'your-dsn',
 *   integrations: [
 *     Sentry.growthbookIntegration({ growthbookClass: GrowthBook })
 *   ]
 * });
 * ```
 */
const growthbookIntegration = integration.defineIntegration(
  ({ growthbookClass }) => {
    return {
      name: 'GrowthBook',

      setupOnce() {
        const proto = growthbookClass.prototype ;

        // Type guard and wrap isOn
        if (typeof proto.isOn === 'function') {
          object.fill(proto, 'isOn', _wrapAndCaptureBooleanResult);
        }

        // Type guard and wrap getFeatureValue
        if (typeof proto.getFeatureValue === 'function') {
          object.fill(proto, 'getFeatureValue', _wrapAndCaptureBooleanResult);
        }
      },

      processEvent(event, _hint, _client) {
        return featureFlags._INTERNAL_copyFlagsFromScopeToEvent(event);
      },
    };
  },
);

function _wrapAndCaptureBooleanResult(
  original,
) {
  return function ( ...args) {
    const flagName = args[0];
    const result = original.apply(this, args);

    if (typeof flagName === 'string' && typeof result === 'boolean') {
      featureFlags._INTERNAL_insertFlagToScope(flagName, result);
      featureFlags._INTERNAL_addFeatureFlagToActiveSpan(flagName, result);
    }

    return result;
  };
}

exports.growthbookIntegration = growthbookIntegration;
//# sourceMappingURL=growthbook.js.map
