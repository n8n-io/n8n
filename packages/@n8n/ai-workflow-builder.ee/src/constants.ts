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
export const AVG_CHARS_PER_TOKEN_ANTHROPIC = 3.5;

/**
 * Maximum characters allowed for a single node example configuration.
 * Examples exceeding this limit are filtered out to avoid context bloat.
 * Based on ~5000 tokens at AVG_CHARS_PER_TOKEN_ANTHROPIC ratio.
 */
export const MAX_NODE_EXAMPLE_CHARS = 5000 * AVG_CHARS_PER_TOKEN_ANTHROPIC;

/**
 * Max characters for execution data truncation in tool responses.
 * Prevents tool responses from becoming too large and filling up the context.
 */
export const MAX_EXECUTION_DATA_CHARS = 10000;

/**
 * Max characters for AI response in conversation context.
 * Used when including previous AI responses to provide context.
 */
export const MAX_AI_RESPONSE_CHARS = 500;

/**
 * Maximum iterations for subgraph tool loops.
 * Prevents infinite loops when agents keep calling tools without finishing.
 */
export const MAX_BUILDER_ITERATIONS = 100;
export const MAX_DISCOVERY_ITERATIONS = 50;
export const MAX_TRIAGE_ITERATIONS = 10;
export const MAX_MULTI_AGENT_STREAM_ITERATIONS = MAX_BUILDER_ITERATIONS + MAX_DISCOVERY_ITERATIONS;

/**
 * Separator used by the backend stream protocol (packages/cli/src/constants.ts:145).
 * Duplicated here so the ai-workflow-builder package doesn't need a dependency on packages/cli.
 */
export const STREAM_SEPARATOR = '⧉⇋⇋➽⌑⧉§§\n';

/**
 * Timeout in milliseconds for the Assistant SDK stream.
 * If the SDK doesn't finish within this time, the stream is aborted.
 * Prevents the assistant subgraph from hanging indefinitely when the SDK
 * gets stuck sending intermediate-step messages without a final response.
 */
export const ASSISTANT_SDK_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
