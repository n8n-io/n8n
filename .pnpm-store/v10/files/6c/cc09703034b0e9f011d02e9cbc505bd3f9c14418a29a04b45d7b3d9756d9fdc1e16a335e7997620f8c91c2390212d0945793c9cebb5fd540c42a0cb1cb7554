Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

const openFeatureIntegration = core.defineIntegration(() => {
  return {
    name: 'OpenFeature',

    processEvent(event, _hint, _client) {
      return core._INTERNAL_copyFlagsFromScopeToEvent(event);
    },
  };
}) ;

/**
 * OpenFeature Hook class implementation.
 */
class OpenFeatureIntegrationHook  {
  /**
   * Successful evaluation result.
   */
   after(_hookContext, evaluationDetails) {
    core._INTERNAL_insertFlagToScope(evaluationDetails.flagKey, evaluationDetails.value);
    core._INTERNAL_addFeatureFlagToActiveSpan(evaluationDetails.flagKey, evaluationDetails.value);
  }

  /**
   * On error evaluation result.
   */
   error(hookContext, _error, _hookHints) {
    core._INTERNAL_insertFlagToScope(hookContext.flagKey, hookContext.defaultValue);
    core._INTERNAL_addFeatureFlagToActiveSpan(hookContext.flagKey, hookContext.defaultValue);
  }
}

exports.OpenFeatureIntegrationHook = OpenFeatureIntegrationHook;
exports.openFeatureIntegration = openFeatureIntegration;
//# sourceMappingURL=integration.js.map
