Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');
const instrumentation = require('./instrumentation.js');

const instrumentLangGraph = nodeCore.generateInstrumentOnce(
  core.LANGGRAPH_INTEGRATION_NAME,
  options => new instrumentation.SentryLangGraphInstrumentation(options),
);

const _langGraphIntegration = ((options = {}) => {
  return {
    name: core.LANGGRAPH_INTEGRATION_NAME,
    setupOnce() {
      instrumentLangGraph(options);
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for LangGraph.
 *
 * This integration is enabled by default.
 *
 * When configured, this integration automatically instruments LangGraph StateGraph and compiled graph instances
 * to capture telemetry data following OpenTelemetry Semantic Conventions for Generative AI.
 *
 * @example
 * ```javascript
 * import * as Sentry from '@sentry/node';
 *
 * Sentry.init({
 *   integrations: [Sentry.langGraphIntegration()],
 * });
 * ```
 *
 * ## Options
 *
 * - `recordInputs`: Whether to record input messages (default: respects `sendDefaultPii` client option)
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
 *     Sentry.langGraphIntegration({
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
 *     Sentry.langGraphIntegration({
 *       recordInputs: false,
 *       recordOutputs: false
 *     })
 *   ],
 * });
 * ```
 *
 * ## Captured Operations
 *
 * The integration captures the following LangGraph operations:
 * - **Agent Creation** (`StateGraph.compile()`) - Creates a `gen_ai.create_agent` span
 * - **Agent Invocation** (`CompiledGraph.invoke()`) - Creates a `gen_ai.invoke_agent` span
 *
 * ## Captured Data
 *
 * When `recordInputs` and `recordOutputs` are enabled, the integration captures:
 * - Input messages from the graph state
 * - Output messages and LLM responses
 * - Tool calls made during agent execution
 * - Agent and graph names
 * - Available tools configured in the graph
 *
 */
const langGraphIntegration = core.defineIntegration(_langGraphIntegration);

exports.instrumentLangGraph = instrumentLangGraph;
exports.langGraphIntegration = langGraphIntegration;
//# sourceMappingURL=index.js.map
