import { GOOGLE_GENAI_INTEGRATION_NAME, defineIntegration } from '@sentry/core';
import { generateInstrumentOnce } from '@sentry/node-core';
import { SentryGoogleGenAiInstrumentation } from './instrumentation.js';

const instrumentGoogleGenAI = generateInstrumentOnce(
  GOOGLE_GENAI_INTEGRATION_NAME,
  options => new SentryGoogleGenAiInstrumentation(options),
);

const _googleGenAIIntegration = ((options = {}) => {
  return {
    name: GOOGLE_GENAI_INTEGRATION_NAME,
    setupOnce() {
      instrumentGoogleGenAI(options);
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for the Google Generative AI SDK.
 *
 * This integration is enabled by default.
 *
 * When configured, this integration automatically instruments Google GenAI SDK client instances
 * to capture telemetry data following OpenTelemetry Semantic Conventions for Generative AI.
 *
 * @example
 * ```javascript
 * import * as Sentry from '@sentry/node';
 *
 * Sentry.init({
 *   integrations: [Sentry.googleGenAiIntegration()],
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
 *     Sentry.googleGenAiIntegration({
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
 *     Sentry.googleGenAiIntegration({
 *       recordInputs: false,
 *       recordOutputs: false
 *     })
 *   ],
 * });
 * ```
 *
 */
const googleGenAIIntegration = defineIntegration(_googleGenAIIntegration);

export { googleGenAIIntegration, instrumentGoogleGenAI };
//# sourceMappingURL=index.js.map
