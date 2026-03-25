Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

/* eslint-disable max-lines */
/**
 * AI SDK Telemetry Attributes
 * Based on https://ai-sdk.dev/docs/ai-sdk-core/telemetry#collected-data
 */

// =============================================================================
// COMMON ATTRIBUTES
// =============================================================================

/**
 * Common attribute for operation name across all functions and spans
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#collected-data
 */
const OPERATION_NAME_ATTRIBUTE = 'operation.name';

/**
 * Common attribute for AI operation ID across all functions and spans
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#collected-data
 */
const AI_OPERATION_ID_ATTRIBUTE = 'ai.operationId';

// =============================================================================
// SHARED ATTRIBUTES
// =============================================================================

/**
 * `generateText` function - `ai.generateText` span
 * `streamText` function - `ai.streamText` span
 *
 * The prompt that was used when calling the function
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#generatetext-function
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#streamtext-function
 */
const AI_PROMPT_ATTRIBUTE = 'ai.prompt';

/**
 * `generateObject` function - `ai.generateObject` span
 * `streamObject` function - `ai.streamObject` span
 *
 * The JSON schema version of the schema that was passed into the function
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#generateobject-function
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#streamobject-function
 */
const AI_SCHEMA_ATTRIBUTE = 'ai.schema';

/**
 * `generateObject` function - `ai.generateObject` span
 * `streamObject` function - `ai.streamObject` span
 *
 * The object that was generated (stringified JSON)
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#generateobject-function
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#streamobject-function
 */
const AI_RESPONSE_OBJECT_ATTRIBUTE = 'ai.response.object';

// =============================================================================
// GENERATETEXT FUNCTION - UNIQUE ATTRIBUTES
// =============================================================================

/**
 * `generateText` function - `ai.generateText` span
 *
 * The text that was generated
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#generatetext-function
 */
const AI_RESPONSE_TEXT_ATTRIBUTE = 'ai.response.text';

/**
 * `generateText` function - `ai.generateText` span
 *
 * The tool calls that were made as part of the generation (stringified JSON)
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#generatetext-function
 */
const AI_RESPONSE_TOOL_CALLS_ATTRIBUTE = 'ai.response.toolCalls';

/**
 * `generateText` function - `ai.generateText.doGenerate` span
 *
 * The messages that were passed into the provider
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#generatetext-function
 */
const AI_PROMPT_MESSAGES_ATTRIBUTE = 'ai.prompt.messages';

/**
 * `generateText` function - `ai.generateText.doGenerate` span
 *
 * Array of stringified tool definitions
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#generatetext-function
 */
const AI_PROMPT_TOOLS_ATTRIBUTE = 'ai.prompt.tools';

/**
 * Basic LLM span information
 * Multiple spans
 *
 * The id of the model
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#basic-llm-span-information
 */
const AI_MODEL_ID_ATTRIBUTE = 'ai.model.id';

/**
 * Basic LLM span information
 * Multiple spans
 *
 * Provider specific metadata returned with the generation response
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#basic-llm-span-information
 */
const AI_RESPONSE_PROVIDER_METADATA_ATTRIBUTE = 'ai.response.providerMetadata';

/**
 * Basic LLM span information
 * Multiple spans
 *
 * The number of cached input tokens that were used
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#basic-llm-span-information
 */
const AI_USAGE_CACHED_INPUT_TOKENS_ATTRIBUTE = 'ai.usage.cachedInputTokens';
/**
 * Basic LLM span information
 * Multiple spans
 *
 * The functionId that was set through `telemetry.functionId`
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#basic-llm-span-information
 */
const AI_TELEMETRY_FUNCTION_ID_ATTRIBUTE = 'ai.telemetry.functionId';

/**
 * Basic LLM span information
 * Multiple spans
 *
 * The number of completion tokens that were used
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#basic-llm-span-information
 */
const AI_USAGE_COMPLETION_TOKENS_ATTRIBUTE = 'ai.usage.completionTokens';

/**
 * Basic LLM span information
 * Multiple spans
 *
 * The number of prompt tokens that were used
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#basic-llm-span-information
 */
const AI_USAGE_PROMPT_TOKENS_ATTRIBUTE = 'ai.usage.promptTokens';

// =============================================================================
// TOOL CALL SPANS
// =============================================================================

/**
 * Tool call spans
 * `ai.toolCall` span
 *
 * The name of the tool
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#tool-call-spans
 */
const AI_TOOL_CALL_NAME_ATTRIBUTE = 'ai.toolCall.name';

/**
 * Tool call spans
 * `ai.toolCall` span
 *
 * The id of the tool call
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#tool-call-spans
 */
const AI_TOOL_CALL_ID_ATTRIBUTE = 'ai.toolCall.id';

/**
 * Tool call spans
 * `ai.toolCall` span
 *
 * The parameters of the tool call
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#tool-call-spans
 */
const AI_TOOL_CALL_ARGS_ATTRIBUTE = 'ai.toolCall.args';

/**
 * Tool call spans
 * `ai.toolCall` span
 *
 * The result of the tool call
 * @see https://ai-sdk.dev/docs/ai-sdk-core/telemetry#tool-call-spans
 */
const AI_TOOL_CALL_RESULT_ATTRIBUTE = 'ai.toolCall.result';

// =============================================================================
// PROVIDER METADATA
// =============================================================================

/**
 * OpenAI Provider Metadata
 * @see https://ai-sdk.dev/providers/ai-sdk-providers/openai
 * @see https://github.com/vercel/ai/blob/65e042afde6aad4da9d7a62526ece839eb34f9a5/packages/openai/src/openai-chat-language-model.ts#L397-L416
 * @see https://github.com/vercel/ai/blob/65e042afde6aad4da9d7a62526ece839eb34f9a5/packages/openai/src/responses/openai-responses-language-model.ts#L377C7-L384
 */

exports.AI_MODEL_ID_ATTRIBUTE = AI_MODEL_ID_ATTRIBUTE;
exports.AI_OPERATION_ID_ATTRIBUTE = AI_OPERATION_ID_ATTRIBUTE;
exports.AI_PROMPT_ATTRIBUTE = AI_PROMPT_ATTRIBUTE;
exports.AI_PROMPT_MESSAGES_ATTRIBUTE = AI_PROMPT_MESSAGES_ATTRIBUTE;
exports.AI_PROMPT_TOOLS_ATTRIBUTE = AI_PROMPT_TOOLS_ATTRIBUTE;
exports.AI_RESPONSE_OBJECT_ATTRIBUTE = AI_RESPONSE_OBJECT_ATTRIBUTE;
exports.AI_RESPONSE_PROVIDER_METADATA_ATTRIBUTE = AI_RESPONSE_PROVIDER_METADATA_ATTRIBUTE;
exports.AI_RESPONSE_TEXT_ATTRIBUTE = AI_RESPONSE_TEXT_ATTRIBUTE;
exports.AI_RESPONSE_TOOL_CALLS_ATTRIBUTE = AI_RESPONSE_TOOL_CALLS_ATTRIBUTE;
exports.AI_SCHEMA_ATTRIBUTE = AI_SCHEMA_ATTRIBUTE;
exports.AI_TELEMETRY_FUNCTION_ID_ATTRIBUTE = AI_TELEMETRY_FUNCTION_ID_ATTRIBUTE;
exports.AI_TOOL_CALL_ARGS_ATTRIBUTE = AI_TOOL_CALL_ARGS_ATTRIBUTE;
exports.AI_TOOL_CALL_ID_ATTRIBUTE = AI_TOOL_CALL_ID_ATTRIBUTE;
exports.AI_TOOL_CALL_NAME_ATTRIBUTE = AI_TOOL_CALL_NAME_ATTRIBUTE;
exports.AI_TOOL_CALL_RESULT_ATTRIBUTE = AI_TOOL_CALL_RESULT_ATTRIBUTE;
exports.AI_USAGE_CACHED_INPUT_TOKENS_ATTRIBUTE = AI_USAGE_CACHED_INPUT_TOKENS_ATTRIBUTE;
exports.AI_USAGE_COMPLETION_TOKENS_ATTRIBUTE = AI_USAGE_COMPLETION_TOKENS_ATTRIBUTE;
exports.AI_USAGE_PROMPT_TOKENS_ATTRIBUTE = AI_USAGE_PROMPT_TOKENS_ATTRIBUTE;
exports.OPERATION_NAME_ATTRIBUTE = OPERATION_NAME_ATTRIBUTE;
//# sourceMappingURL=vercel-ai-attributes.js.map
