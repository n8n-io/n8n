import { GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE, GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE, GEN_AI_USAGE_TOTAL_TOKENS_ATTRIBUTE } from './gen-ai-attributes.js';
import { truncateGenAiStringInput, truncateGenAiMessages } from './messageTruncation.js';

/**
 * Maps AI method paths to Sentry operation name
 */
function getFinalOperationName(methodPath) {
  if (methodPath.includes('messages')) {
    return 'messages';
  }
  if (methodPath.includes('completions')) {
    return 'completions';
  }
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
      [GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE]: promptTokens,
    });
  }
  if (completionTokens !== undefined) {
    span.setAttributes({
      [GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE]: completionTokens,
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
      [GEN_AI_USAGE_TOTAL_TOKENS_ATTRIBUTE]: totalTokens,
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
    return truncateGenAiStringInput(value);
  }
  if (Array.isArray(value)) {
    // truncateGenAiMessages returns an array of strings, so we need to stringify it
    const truncatedMessages = truncateGenAiMessages(value);
    return JSON.stringify(truncatedMessages);
  }
  // value is an object, so we need to stringify it
  return JSON.stringify(value);
}

export { buildMethodPath, getFinalOperationName, getSpanOperation, getTruncatedJsonString, setTokenUsageAttributes };
//# sourceMappingURL=utils.js.map
