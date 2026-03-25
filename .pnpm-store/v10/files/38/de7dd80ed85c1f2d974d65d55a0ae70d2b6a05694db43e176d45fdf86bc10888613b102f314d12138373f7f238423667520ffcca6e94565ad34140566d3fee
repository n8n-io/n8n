Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');
const instrumentation = require('./instrumentation.js');

const instrumentAnthropicAi = nodeCore.generateInstrumentOnce(
  core.ANTHROPIC_AI_INTEGRATION_NAME,
  options => new instrumentation.SentryAnthropicAiInstrumentation(options),
);

const _anthropicAIIntegration = ((options = {}) => {
  return {
    name: core.ANTHROPIC_AI_INTEGRATION_NAME,
    options,
    setupOnce() {
      instrumentAnthropicAi(options);
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for the Anthropic AI SDK.
 *
 * This integration is enabled by default.
 *
 * When configured, this integration automatically instruments Anthropic AI SDK client instances
 * to capture telemetry data following OpenTelemetry Semantic Conventions for Generative AI.
 *
 * @example
 * ```javascript
 * import * as Sentry from '@sentry/node';
 *
 * Sentry.init({
 *   integrations: [Sentry.anthropicAIIntegration()],
 * });
 * ```
 *
 * ## Options
 *
 * - `recordInputs`: Whether to record prompt messages (default: respects `sendDefaultPii` client option)
 * - `recordOutputs`: Whether to record response text (default: respects `sendDefaultPii` client option)
 *
 * ### Default Behavior
 *
 * By default, the integration will:
 * - Record inputs and outputs ONLY if `sendDefaultPii` is set to `true` in your Sentry client options
 * - Otherwise, inputs and outputs are NOT recorded unless explicitly enabled
 *
 * @example
 * ```javascript
 * // Record inputs and outputs when sendDefaultPii is false
 * Sentry.init({
 *   integrations: [
 *     Sentry.anthropicAIIntegration({
 *       recordInputs: true,
 *       recordOutputs: true
 *     })
 *   ],
 * });
 *
 * // Never record inputs/outputs regardless of sendDefaultPii
 * Sentry.init({
 *   sendDefaultPii: true,
 *   integrations: [
 *     Sentry.anthropicAIIntegration({
 *       recordInputs: false,
 *       recordOutputs: false
 *     })
 *   ],
 * });
 * ```
 *
 */
const anthropicAIIntegration = core.defineIntegration(_anthropicAIIntegration);

exports.anthropicAIIntegration = anthropicAIIntegration;
exports.instrumentAnthropicAi = instrumentAnthropicAi;
//# sourceMappingURL=index.js.map
