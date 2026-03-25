import { defineIntegration } from '../../integration.js';
import { _INTERNAL_copyFlagsFromScopeToEvent, _INTERNAL_insertFlagToScope, _INTERNAL_addFeatureFlagToActiveSpan } from '../../utils/featureFlags.js';
import { fill } from '../../utils/object.js';

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
const growthbookIntegration = defineIntegration(
  ({ growthbookClass }) => {
    return {
      name: 'GrowthBook',

      setupOnce() {
        const proto = growthbookClass.prototype ;

        // Type guard and wrap isOn
        if (typeof proto.isOn === 'function') {
          fill(proto, 'isOn', _wrapAndCaptureBooleanResult);
        }

        // Type guard and wrap getFeatureValue
        if (typeof proto.getFeatureValue === 'function') {
          fill(proto, 'getFeatureValue', _wrapAndCaptureBooleanResult);
        }
      },

      processEvent(event, _hint, _client) {
        return _INTERNAL_copyFlagsFromScopeToEvent(event);
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
      _INTERNAL_insertFlagToScope(flagName, result);
      _INTERNAL_addFeatureFlagToActiveSpan(flagName, result);
    }

    return result;
  };
}

export { growthbookIntegration };
//# sourceMappingURL=growthbook.js.map
