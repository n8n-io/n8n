/**
 * Maximum length of user prompt message in characters.
 * Prevents excessively long messages that could consume too many tokens.
 */
export const MAX_AI_BUILDER_PROMPT_LENGTH = 5000; // characters

/**
 * Token limits for the LLM context window.
 */
export const MAX_TOTAL_TOKENS = 200_000;
export const MAX_OUTPUT_TOKENS = 16_000;
export const MAX_INPUT_TOKENS = MAX_TOTAL_TOKENS - MAX_OUTPUT_TOKENS - 5_000;

/**
 * Maximum length of individual parameter value that can be retrieved via tool call.
 * Prevents tool responses from becoming too large and filling up the context.
 */
export const MAX_PARAMETER_VALUE_LENGTH = 30_000;

/**
 * Token threshold for automatically compacting conversation history.
 * When conversation exceeds this limit, older messages are summarized to free up space.
 * Set to 150k tokens to provide a safety margin before hitting the MAX_INPUT_TOKENS limit.
 * This includes all token types: input, output, cache_creation, and cache_read tokens.
 */
export const DEFAULT_AUTO_COMPACT_THRESHOLD_TOKENS = MAX_TOTAL_TOKENS - 50_000;

/**
 * Maximum token count for workflow JSON after trimming.
 * Used to determine when a workflow is small enough to include in context.
 */
export const MAX_WORKFLOW_LENGTH_TOKENS = 30_000;

/**
 * Average character-to-token ratio for Anthropic models.
 * Used for rough token count estimation from character counts.
 */
export const AVG_CHARS_PER_TOKEN_ANTHROPIC = 2.5;
