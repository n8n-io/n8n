export const MAX_AI_BUILDER_PROMPT_LENGTH = 1000; // characters

export const MAX_TOTAL_TOKENS = 200_000; // Maximum total tokens in the context window (input + output)
export const MAX_OUTPUT_TOKENS = 16000;
export const MAX_INPUT_TOKENS = MAX_TOTAL_TOKENS - MAX_OUTPUT_TOKENS;

export const MAX_PARAMETER_VALUE_LENGTH = 30_000; // Maximum length of individual parameter value that can be retrieved via tool call

export const DEFAULT_AUTO_COMPACT_THRESHOLD_TOKENS = 20_000; // Tokens threshold for auto-compacting the conversation

export const MAX_WORKFLOW_LENGTH_TOKENS = 30_000; // Maximum token length for the workflow JSON

export const AVG_CHARS_PER_TOKEN_ANTHROPIC = 2.5; // Average characters per token for rough estimates
