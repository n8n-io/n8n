/**
 * OpenAI Integration Telemetry Attributes
 * Based on OpenTelemetry Semantic Conventions for Generative AI
 * @see https://opentelemetry.io/docs/specs/semconv/gen-ai/
 */

// =============================================================================
// OPENTELEMETRY SEMANTIC CONVENTIONS FOR GENAI
// =============================================================================

/**
 * The input messages sent to the model
 */
const GEN_AI_PROMPT_ATTRIBUTE = 'gen_ai.prompt';

/**
 * The Generative AI system being used
 * For OpenAI, this should always be "openai"
 */
const GEN_AI_SYSTEM_ATTRIBUTE = 'gen_ai.system';

/**
 * The name of the model as requested
 * Examples: "gpt-4", "gpt-3.5-turbo"
 */
const GEN_AI_REQUEST_MODEL_ATTRIBUTE = 'gen_ai.request.model';

/**
 * Whether streaming was enabled for the request
 */
const GEN_AI_REQUEST_STREAM_ATTRIBUTE = 'gen_ai.request.stream';

/**
 * The temperature setting for the model request
 */
const GEN_AI_REQUEST_TEMPERATURE_ATTRIBUTE = 'gen_ai.request.temperature';

/**
 * The maximum number of tokens requested
 */
const GEN_AI_REQUEST_MAX_TOKENS_ATTRIBUTE = 'gen_ai.request.max_tokens';

/**
 * The frequency penalty setting for the model request
 */
const GEN_AI_REQUEST_FREQUENCY_PENALTY_ATTRIBUTE = 'gen_ai.request.frequency_penalty';

/**
 * The presence penalty setting for the model request
 */
const GEN_AI_REQUEST_PRESENCE_PENALTY_ATTRIBUTE = 'gen_ai.request.presence_penalty';

/**
 * The top_p (nucleus sampling) setting for the model request
 */
const GEN_AI_REQUEST_TOP_P_ATTRIBUTE = 'gen_ai.request.top_p';

/**
 * The top_k setting for the model request
 */
const GEN_AI_REQUEST_TOP_K_ATTRIBUTE = 'gen_ai.request.top_k';

/**
 * The encoding format for the model request
 */
const GEN_AI_REQUEST_ENCODING_FORMAT_ATTRIBUTE = 'gen_ai.request.encoding_format';

/**
 * The dimensions for the model request
 */
const GEN_AI_REQUEST_DIMENSIONS_ATTRIBUTE = 'gen_ai.request.dimensions';

/**
 * Array of reasons why the model stopped generating tokens
 */
const GEN_AI_RESPONSE_FINISH_REASONS_ATTRIBUTE = 'gen_ai.response.finish_reasons';

/**
 * The name of the model that generated the response
 */
const GEN_AI_RESPONSE_MODEL_ATTRIBUTE = 'gen_ai.response.model';

/**
 * The unique identifier for the response
 */
const GEN_AI_RESPONSE_ID_ATTRIBUTE = 'gen_ai.response.id';

/**
 * The reason why the model stopped generating tokens
 */
const GEN_AI_RESPONSE_STOP_REASON_ATTRIBUTE = 'gen_ai.response.stop_reason';

/**
 * The number of tokens used in the prompt
 */
const GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE = 'gen_ai.usage.input_tokens';

/**
 * The number of tokens used in the response
 */
const GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE = 'gen_ai.usage.output_tokens';

/**
 * The total number of tokens used (input + output)
 */
const GEN_AI_USAGE_TOTAL_TOKENS_ATTRIBUTE = 'gen_ai.usage.total_tokens';

/**
 * The operation name
 */
const GEN_AI_OPERATION_NAME_ATTRIBUTE = 'gen_ai.operation.name';

/**
 * Original length of messages array, used to indicate truncations had occured
 */
const GEN_AI_REQUEST_MESSAGES_ORIGINAL_LENGTH_ATTRIBUTE = 'gen_ai.request.messages.original_length';

/**
 * The prompt messages
 * Only recorded when recordInputs is enabled
 */
const GEN_AI_REQUEST_MESSAGES_ATTRIBUTE = 'gen_ai.request.messages';

/**
 * The response text
 * Only recorded when recordOutputs is enabled
 */
const GEN_AI_RESPONSE_TEXT_ATTRIBUTE = 'gen_ai.response.text';

/**
 * The available tools from incoming request
 * Only recorded when recordInputs is enabled
 */
const GEN_AI_REQUEST_AVAILABLE_TOOLS_ATTRIBUTE = 'gen_ai.request.available_tools';

/**
 * Whether the response is a streaming response
 */
const GEN_AI_RESPONSE_STREAMING_ATTRIBUTE = 'gen_ai.response.streaming';

/**
 * The tool calls from the response
 * Only recorded when recordOutputs is enabled
 */
const GEN_AI_RESPONSE_TOOL_CALLS_ATTRIBUTE = 'gen_ai.response.tool_calls';

/**
 * The agent name
 */
const GEN_AI_AGENT_NAME_ATTRIBUTE = 'gen_ai.agent.name';

/**
 * The pipeline name
 */
const GEN_AI_PIPELINE_NAME_ATTRIBUTE = 'gen_ai.pipeline.name';

/**
 * The conversation ID for linking messages across API calls
 * For OpenAI Assistants API: thread_id
 * For LangGraph: configurable.thread_id
 */
const GEN_AI_CONVERSATION_ID_ATTRIBUTE = 'gen_ai.conversation.id';

/**
 * The number of cache creation input tokens used
 */
const GEN_AI_USAGE_CACHE_CREATION_INPUT_TOKENS_ATTRIBUTE = 'gen_ai.usage.cache_creation_input_tokens';

/**
 * The number of cache read input tokens used
 */
const GEN_AI_USAGE_CACHE_READ_INPUT_TOKENS_ATTRIBUTE = 'gen_ai.usage.cache_read_input_tokens';

/**
 * The number of cache write input tokens used
 */
const GEN_AI_USAGE_INPUT_TOKENS_CACHE_WRITE_ATTRIBUTE = 'gen_ai.usage.input_tokens.cache_write';

/**
 * The number of cached input tokens that were used
 */
const GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE = 'gen_ai.usage.input_tokens.cached';

/**
 * The span operation name for invoking an agent
 */
const GEN_AI_INVOKE_AGENT_OPERATION_ATTRIBUTE = 'gen_ai.invoke_agent';

/**
 * The span operation name for generating text
 */
const GEN_AI_GENERATE_TEXT_DO_GENERATE_OPERATION_ATTRIBUTE = 'gen_ai.generate_text';

/**
 * The span operation name for streaming text
 */
const GEN_AI_STREAM_TEXT_DO_STREAM_OPERATION_ATTRIBUTE = 'gen_ai.stream_text';

/**
 * The span operation name for generating object
 */
const GEN_AI_GENERATE_OBJECT_DO_GENERATE_OPERATION_ATTRIBUTE = 'gen_ai.generate_object';

/**
 * The span operation name for streaming object
 */
const GEN_AI_STREAM_OBJECT_DO_STREAM_OPERATION_ATTRIBUTE = 'gen_ai.stream_object';

/**
 * The span operation name for embedding
 */
const GEN_AI_EMBED_DO_EMBED_OPERATION_ATTRIBUTE = 'gen_ai.embed';

/**
 * The span operation name for embedding many
 */
const GEN_AI_EMBED_MANY_DO_EMBED_OPERATION_ATTRIBUTE = 'gen_ai.embed_many';

/**
 * The span operation name for executing a tool
 */
const GEN_AI_EXECUTE_TOOL_OPERATION_ATTRIBUTE = 'gen_ai.execute_tool';

// =============================================================================
// OPENAI-SPECIFIC ATTRIBUTES
// =============================================================================

/**
 * The response ID from OpenAI
 */
const OPENAI_RESPONSE_ID_ATTRIBUTE = 'openai.response.id';

/**
 * The response model from OpenAI
 */
const OPENAI_RESPONSE_MODEL_ATTRIBUTE = 'openai.response.model';

/**
 * The response timestamp from OpenAI (ISO string)
 */
const OPENAI_RESPONSE_TIMESTAMP_ATTRIBUTE = 'openai.response.timestamp';

/**
 * The number of completion tokens used
 */
const OPENAI_USAGE_COMPLETION_TOKENS_ATTRIBUTE = 'openai.usage.completion_tokens';

/**
 * The number of prompt tokens used
 */
const OPENAI_USAGE_PROMPT_TOKENS_ATTRIBUTE = 'openai.usage.prompt_tokens';

// =============================================================================
// OPENAI OPERATIONS
// =============================================================================

/**
 * OpenAI API operations
 */
const OPENAI_OPERATIONS = {
  CHAT: 'chat',
  RESPONSES: 'responses',
  EMBEDDINGS: 'embeddings',
  CONVERSATIONS: 'conversations',
} ;

// =============================================================================
// ANTHROPIC AI OPERATIONS
// =============================================================================

/**
 * The response timestamp from Anthropic AI (ISO string)
 */
const ANTHROPIC_AI_RESPONSE_TIMESTAMP_ATTRIBUTE = 'anthropic.response.timestamp';

export { ANTHROPIC_AI_RESPONSE_TIMESTAMP_ATTRIBUTE, GEN_AI_AGENT_NAME_ATTRIBUTE, GEN_AI_CONVERSATION_ID_ATTRIBUTE, GEN_AI_EMBED_DO_EMBED_OPERATION_ATTRIBUTE, GEN_AI_EMBED_MANY_DO_EMBED_OPERATION_ATTRIBUTE, GEN_AI_EXECUTE_TOOL_OPERATION_ATTRIBUTE, GEN_AI_GENERATE_OBJECT_DO_GENERATE_OPERATION_ATTRIBUTE, GEN_AI_GENERATE_TEXT_DO_GENERATE_OPERATION_ATTRIBUTE, GEN_AI_INVOKE_AGENT_OPERATION_ATTRIBUTE, GEN_AI_OPERATION_NAME_ATTRIBUTE, GEN_AI_PIPELINE_NAME_ATTRIBUTE, GEN_AI_PROMPT_ATTRIBUTE, GEN_AI_REQUEST_AVAILABLE_TOOLS_ATTRIBUTE, GEN_AI_REQUEST_DIMENSIONS_ATTRIBUTE, GEN_AI_REQUEST_ENCODING_FORMAT_ATTRIBUTE, GEN_AI_REQUEST_FREQUENCY_PENALTY_ATTRIBUTE, GEN_AI_REQUEST_MAX_TOKENS_ATTRIBUTE, GEN_AI_REQUEST_MESSAGES_ATTRIBUTE, GEN_AI_REQUEST_MESSAGES_ORIGINAL_LENGTH_ATTRIBUTE, GEN_AI_REQUEST_MODEL_ATTRIBUTE, GEN_AI_REQUEST_PRESENCE_PENALTY_ATTRIBUTE, GEN_AI_REQUEST_STREAM_ATTRIBUTE, GEN_AI_REQUEST_TEMPERATURE_ATTRIBUTE, GEN_AI_REQUEST_TOP_K_ATTRIBUTE, GEN_AI_REQUEST_TOP_P_ATTRIBUTE, GEN_AI_RESPONSE_FINISH_REASONS_ATTRIBUTE, GEN_AI_RESPONSE_ID_ATTRIBUTE, GEN_AI_RESPONSE_MODEL_ATTRIBUTE, GEN_AI_RESPONSE_STOP_REASON_ATTRIBUTE, GEN_AI_RESPONSE_STREAMING_ATTRIBUTE, GEN_AI_RESPONSE_TEXT_ATTRIBUTE, GEN_AI_RESPONSE_TOOL_CALLS_ATTRIBUTE, GEN_AI_STREAM_OBJECT_DO_STREAM_OPERATION_ATTRIBUTE, GEN_AI_STREAM_TEXT_DO_STREAM_OPERATION_ATTRIBUTE, GEN_AI_SYSTEM_ATTRIBUTE, GEN_AI_USAGE_CACHE_CREATION_INPUT_TOKENS_ATTRIBUTE, GEN_AI_USAGE_CACHE_READ_INPUT_TOKENS_ATTRIBUTE, GEN_AI_USAGE_INPUT_TOKENS_ATTRIBUTE, GEN_AI_USAGE_INPUT_TOKENS_CACHED_ATTRIBUTE, GEN_AI_USAGE_INPUT_TOKENS_CACHE_WRITE_ATTRIBUTE, GEN_AI_USAGE_OUTPUT_TOKENS_ATTRIBUTE, GEN_AI_USAGE_TOTAL_TOKENS_ATTRIBUTE, OPENAI_OPERATIONS, OPENAI_RESPONSE_ID_ATTRIBUTE, OPENAI_RESPONSE_MODEL_ATTRIBUTE, OPENAI_RESPONSE_TIMESTAMP_ATTRIBUTE, OPENAI_USAGE_COMPLETION_TOKENS_ATTRIBUTE, OPENAI_USAGE_PROMPT_TOKENS_ATTRIBUTE };
//# sourceMappingURL=gen-ai-attributes.js.map
