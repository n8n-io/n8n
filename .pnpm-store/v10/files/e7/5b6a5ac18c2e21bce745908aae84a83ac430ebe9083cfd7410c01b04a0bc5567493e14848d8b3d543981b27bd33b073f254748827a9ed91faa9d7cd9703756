Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const _exports = require('../../exports.js');
const currentScopes = require('../../currentScopes.js');
const is = require('../../utils/is.js');
const genAiAttributes = require('./gen-ai-attributes.js');
const messageTruncation = require('./messageTruncation.js');

/**
 * Shared utils for AI integrations (OpenAI, Anthropic, Verce.AI, etc.)
 */

/**
 * Resolves AI recording options by falling back to the client's `sendDefaultPii` setting.
 * Precedence: explicit option > sendDefaultPii > false
 */
function resolveAIRecordingOptions(options) {
  const sendDefaultPii = Boolean(currentScopes.getClient()?.getOptions().sendDefaultPii);
  return {
    ...options,
    recordInputs: options?.recordInputs ?? sendDefaultPii,
    recordOutputs: options?.recordOutputs ?? sendDefaultPii,
  } ;
}

/**
 * Maps AI method paths to OpenTelemetry semantic convention operation names
 * @see https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/#llm-request-spans
 */
function getFinalOperationName(methodPath) {
  if (methodPath.includes('messages')) {
    return 'chat';
  }
  if (methodPath.includes('completions')) {
    return 'text_completion';
  }
  // Google GenAI: models.generateContent* -> generate_content (actually generates AI responses)
  if (methodPath.includes('generateContent')) {
    return 'generate_content';
  }
  // Anthropic: models.get/retrieve -> models (metadata retrieval only)
  if (methodPath.includes('models')) {
    return 'models';
  }
  if (methodPath.includes('chat')) {
    return 'chat';
  }
  return methodPath.split('.').pop() || 'unknown';
}

/**
 * Get the span operation for AI methods
 * Following Sentry's convention: "gen_ai.{operation_name}"
 */
function getSpanOperation(methodPath) {
  return `gen_ai.${getFinalOperationName(methodPath)}`;
}

/**
 * Build method path from current traversal
 */
function buildMethodPath(currentPath, prop) {
  return currentPath ? `${currentPath}.${prop}` : prop;
}

/**
 * Set token usage attributes
 * @param span - The span to add attributes to
 * @param promptTokens - The number of prompt tokens
 * @param completionTokens - The number of completion tokens
 * @param cachedInputTokens - The number of cached input tokens
 * @param cachedOutputTokens - The number of cached output tokens
 */
function setTokenUsageAttributes(
  span,
  promptTokens,
  completionTokens,
  cachedInputTokens,
  cachedOutputTokens,
) {
  if (promptTokens !== undefined) {
    span.setAttributes({
      [genAiAttributes.GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE]: promptTokens,
    });
  }
  if (completionTokens !== undefined) {
    span.setAttributes({
      [genAiAttributes.GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE]: completionTokens,
    });
  }
  if (
    promptTokens !== undefined ||
    completionTokens !== undefined ||
    cachedInputTokens !== undefined ||
    cachedOutputTokens !== undefined
  ) {
    /**
     * Total input tokens in a request is the summation of `input_tokens`,
     * `cache_creation_input_tokens`, and `cache_read_input_tokens`.
     */
    const totalTokens =
      (promptTokens ?? 0) + (completionTokens ?? 0) + (cachedInputTokens ?? 0) + (cachedOutputTokens ?? 0);

    span.setAttributes({
      [genAiAttributes.GEN_AI_USAGE_TOTAL_TOKENS_ATTRIBUTE]: totalTokens,
    });
  }
}

/**
 * Get the truncated JSON string for a string or array of strings.
 *
 * @param value - The string or array of strings to truncate
 * @returns The truncated JSON string
 */
function getTruncatedJsonString(value) {
  if (typeof value === 'string') {
    // Some values are already JSON strings, so we don't need to duplicate the JSON parsing
    return messageTruncation.truncateGenAiStringInput(value);
  }
  if (Array.isArray(value)) {
    // truncateGenAiMessages returns an array of strings, so we need to stringify it
    const truncatedMessages = messageTruncation.truncateGenAiMessages(value);
    return JSON.stringify(truncatedMessages);
  }
  // value is an object, so we need to stringify it
  return JSON.stringify(value);
}

/**
 * Extract system instructions from messages array.
 * Finds the first system message and formats it according to OpenTelemetry semantic conventions.
 *
 * @param messages - Array of messages to extract system instructions from
 * @returns systemInstructions (JSON string) and filteredMessages (without system message)
 */
function extractSystemInstructions(messages)

 {
  if (!Array.isArray(messages)) {
    return { systemInstructions: undefined, filteredMessages: messages };
  }

  const systemMessageIndex = messages.findIndex(
    msg => msg && typeof msg === 'object' && 'role' in msg && (msg ).role === 'system',
  );

  if (systemMessageIndex === -1) {
    return { systemInstructions: undefined, filteredMessages: messages };
  }

  const systemMessage = messages[systemMessageIndex] ;
  const systemContent =
    typeof systemMessage.content === 'string'
      ? systemMessage.content
      : systemMessage.content !== undefined
        ? JSON.stringify(systemMessage.content)
        : undefined;

  if (!systemContent) {
    return { systemInstructions: undefined, filteredMessages: messages };
  }

  const systemInstructions = JSON.stringify([{ type: 'text', content: systemContent }]);
  const filteredMessages = [...messages.slice(0, systemMessageIndex), ...messages.slice(systemMessageIndex + 1)];

  return { systemInstructions, filteredMessages };
}

/**
 * Creates a wrapped version of .withResponse() that replaces the data field
 * with the instrumented result while preserving metadata (response, request_id).
 */
async function createWithResponseWrapper(
  originalWithResponse,
  instrumentedPromise,
  mechanismType,
) {
  // Attach catch handler to originalWithResponse immediately to prevent unhandled rejection
  // If instrumentedPromise rejects first, we still need this handled
  const safeOriginalWithResponse = originalWithResponse.catch(error => {
    _exports.captureException(error, {
      mechanism: {
        handled: false,
        type: mechanismType,
      },
    });
    throw error;
  });

  const instrumentedResult = await instrumentedPromise;
  const originalWrapper = await safeOriginalWithResponse;

  // Combine instrumented result with original metadata
  if (originalWrapper && typeof originalWrapper === 'object' && 'data' in originalWrapper) {
    return {
      ...originalWrapper,
      data: instrumentedResult,
    };
  }
  return instrumentedResult;
}

/**
 * Wraps a promise-like object to preserve additional methods (like .withResponse())
 * that AI SDK clients (OpenAI, Anthropic) attach to their APIPromise return values.
 *
 * Standard Promise methods (.then, .catch, .finally) are routed to the instrumented
 * promise to preserve Sentry's span instrumentation, while custom SDK methods are
 * forwarded to the original promise to maintain the SDK's API surface.
 */
function wrapPromiseWithMethods(
  originalPromiseLike,
  instrumentedPromise,
  mechanismType,
) {
  // If the original result is not thenable, return the instrumented promise
  if (!is.isThenable(originalPromiseLike)) {
    return instrumentedPromise;
  }

  // Create a proxy that forwards Promise methods to instrumentedPromise
  // and preserves additional methods from the original result
  return new Proxy(originalPromiseLike, {
    get(target, prop) {
      // For standard Promise methods (.then, .catch, .finally, Symbol.toStringTag),
      // use instrumentedPromise to preserve Sentry instrumentation.
      // For custom methods (like .withResponse()), use the original target.
      const useInstrumentedPromise = prop in Promise.prototype || prop === Symbol.toStringTag;
      const source = useInstrumentedPromise ? instrumentedPromise : target;

      const value = Reflect.get(source, prop) ;

      // Special handling for .withResponse() to preserve instrumentation
      // .withResponse() returns { data: T, response: Response, request_id: string }
      if (prop === 'withResponse' && typeof value === 'function') {
        return function wrappedWithResponse() {
          const originalWithResponse = (value ).call(target);
          return createWithResponseWrapper(originalWithResponse, instrumentedPromise, mechanismType);
        };
      }

      return typeof value === 'function' ? value.bind(source) : value;
    },
  }) ;
}

exports.buildMethodPath = buildMethodPath;
exports.extractSystemInstructions = extractSystemInstructions;
exports.getFinalOperationName = getFinalOperationName;
exports.getSpanOperation = getSpanOperation;
exports.getTruncatedJsonString = getTruncatedJsonString;
exports.resolveAIRecordingOptions = resolveAIRecordingOptions;
exports.setTokenUsageAttributes = setTokenUsageAttributes;
exports.wrapPromiseWithMethods = wrapPromiseWithMethods;
//# sourceMappingURL=utils.js.map
