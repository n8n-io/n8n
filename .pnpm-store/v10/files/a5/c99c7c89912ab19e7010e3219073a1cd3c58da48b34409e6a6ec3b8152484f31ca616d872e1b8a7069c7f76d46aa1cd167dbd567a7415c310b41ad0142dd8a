Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const debugBuild = require('../../debug-build.js');
const debugLogger = require('../debug-logger.js');

/**
 * Registry tracking which AI provider modules should skip instrumentation wrapping.
 *
 * This prevents duplicate spans when a higher-level integration (like LangChain)
 * already instruments AI providers at a higher abstraction level.
 */
const SKIPPED_AI_PROVIDERS = new Set();

/**
 * Mark AI provider modules to skip instrumentation wrapping.
 *
 * This prevents duplicate spans when a higher-level integration (like LangChain)
 * already instruments AI providers at a higher abstraction level.
 *
 * @internal
 * @param modules - Array of npm module names to skip (e.g., '@anthropic-ai/sdk', 'openai')
 *
 * @example
 * ```typescript
 * // In LangChain integration
 * _INTERNAL_skipAiProviderWrapping(['@anthropic-ai/sdk', 'openai', '@google/generative-ai']);
 * ```
 */
function _INTERNAL_skipAiProviderWrapping(modules) {
  modules.forEach(module => {
    SKIPPED_AI_PROVIDERS.add(module);
    debugBuild.DEBUG_BUILD && debugLogger.debug.log(`AI provider "${module}" wrapping will be skipped`);
  });
}

/**
 * Check if an AI provider module should skip instrumentation wrapping.
 *
 * @internal
 * @param module - The npm module name (e.g., '@anthropic-ai/sdk', 'openai')
 * @returns true if wrapping should be skipped
 *
 * @example
 * ```typescript
 * // In AI provider instrumentation
 * if (_INTERNAL_shouldSkipAiProviderWrapping('@anthropic-ai/sdk')) {
 *   return Reflect.construct(Original, args); // Don't instrument
 * }
 * ```
 */
function _INTERNAL_shouldSkipAiProviderWrapping(module) {
  return SKIPPED_AI_PROVIDERS.has(module);
}

/**
 * Clear all AI provider skip registrations.
 *
 * This is automatically called at the start of Sentry.init() to ensure a clean state
 * between different client initializations.
 *
 * @internal
 */
function _INTERNAL_clearAiProviderSkips() {
  SKIPPED_AI_PROVIDERS.clear();
  debugBuild.DEBUG_BUILD && debugLogger.debug.log('Cleared AI provider skip registrations');
}

exports._INTERNAL_clearAiProviderSkips = _INTERNAL_clearAiProviderSkips;
exports._INTERNAL_shouldSkipAiProviderWrapping = _INTERNAL_shouldSkipAiProviderWrapping;
exports._INTERNAL_skipAiProviderWrapping = _INTERNAL_skipAiProviderWrapping;
//# sourceMappingURL=providerSkip.js.map
