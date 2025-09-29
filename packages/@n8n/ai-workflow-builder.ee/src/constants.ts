/**
 * Maximum length of user prompt message in characters.
 * Prevents excessively long messages that could consume too many tokens.
 */
export const MAX_AI_BUILDER_PROMPT_LENGTH = 1000; // characters

/**
 * Token limits for the LLM context window.
 */
export const MAX_TOTAL_TOKENS = 200_000; // Total context window size (input + output)
export const MAX_OUTPUT_TOKENS = 16_000; // Reserved tokens for model response
export const MAX_INPUT_TOKENS = MAX_TOTAL_TOKENS - MAX_OUTPUT_TOKENS - 10_000; // Available tokens for input (with some buffer to account for estimation errors)

/**
 * Maximum length of individual parameter value that can be retrieved via tool call.
 * Prevents tool responses from becoming too large and filling up the context.
 */
export const MAX_PARAMETER_VALUE_LENGTH = 30_000; // Maximum length of individual parameter value that can be retrieved via tool call

/**
 * Token threshold for automatically compacting conversation history.
 * When conversation exceeds this limit, older messages are summarized to free up space.
 */
export const DEFAULT_AUTO_COMPACT_THRESHOLD_TOKENS = 20_000; // Tokens threshold for auto-compacting the conversation

/**
 * Maximum token count for workflow JSON after trimming.
 * Used to determine when a workflow is small enough to include in context.
 */
export const MAX_WORKFLOW_LENGTH_TOKENS = 30_000; // Tokens

/**
 * Average character-to-token ratio for Anthropic models.
 * Used for rough token count estimation from character counts.
 */
export const AVG_CHARS_PER_TOKEN_ANTHROPIC = 2.5;
