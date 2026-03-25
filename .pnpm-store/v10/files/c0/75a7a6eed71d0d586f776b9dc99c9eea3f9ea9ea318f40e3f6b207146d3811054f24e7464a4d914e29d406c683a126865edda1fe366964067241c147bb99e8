import { ChatOpenAIReasoningSummary } from "../types.cjs";
import { OpenAI as OpenAI$1 } from "openai";
import { AIMessage, BaseMessage, UsageMetadata } from "@langchain/core/messages";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import { Converter } from "@langchain/core/utils/format";

//#region src/converters/responses.d.ts
type ExcludeController<T> = T extends {
  controller: unknown;
} ? never : T;
type ResponsesCreate = OpenAI$1.Responses["create"];
type ResponsesParse = OpenAI$1.Responses["parse"];
type ResponsesCreateInvoke = ExcludeController<Awaited<ReturnType<ResponsesCreate>>>;
type ResponsesParseInvoke = ExcludeController<Awaited<ReturnType<ResponsesParse>>>;
type ResponsesInputItem = OpenAI$1.Responses.ResponseInputItem;
/**
 * Converts OpenAI Responses API usage statistics to LangChain's UsageMetadata format.
 *
 * This converter transforms token usage information from OpenAI's Responses API into
 * the standardized UsageMetadata format used throughout LangChain. It handles both
 * basic token counts and detailed token breakdowns including cached tokens and
 * reasoning tokens.
 *
 * @param usage - The usage statistics object from OpenAI's Responses API containing
 *                token counts and optional detailed breakdowns.
 *
 * @returns A UsageMetadata object containing:
 *   - `input_tokens`: Total number of tokens in the input/prompt (defaults to 0 if not provided)
 *   - `output_tokens`: Total number of tokens in the model's output (defaults to 0 if not provided)
 *   - `total_tokens`: Combined total of input and output tokens (defaults to 0 if not provided)
 *   - `input_token_details`: Object containing detailed input token information:
 *     - `cache_read`: Number of tokens read from cache (only included if available)
 *   - `output_token_details`: Object containing detailed output token information:
 *     - `reasoning`: Number of tokens used for reasoning (only included if available)
 *
 * @example
 * ```typescript
 * const usage = {
 *   input_tokens: 100,
 *   output_tokens: 50,
 *   total_tokens: 150,
 *   input_tokens_details: { cached_tokens: 20 },
 *   output_tokens_details: { reasoning_tokens: 10 }
 * };
 *
 * const metadata = convertResponsesUsageToUsageMetadata(usage);
 * // Returns:
 * // {
 * //   input_tokens: 100,
 * //   output_tokens: 50,
 * //   total_tokens: 150,
 * //   input_token_details: { cache_read: 20 },
 * //   output_token_details: { reasoning: 10 }
 * // }
 * ```
 *
 * @remarks
 * - The function safely handles undefined or null values by using optional chaining
 *   and nullish coalescing operators
 * - Detailed token information (cache_read, reasoning) is only included in the result
 *   if the corresponding values are present in the input
 * - Token counts default to 0 if not provided in the usage object
 * - This converter is specifically designed for OpenAI's Responses API format and
 *   may differ from other OpenAI API endpoints
 */
declare const convertResponsesUsageToUsageMetadata: Converter<OpenAI$1.Responses.ResponseUsage | undefined, UsageMetadata>;
/**
 * Converts an OpenAI Responses API response to a LangChain AIMessage.
 *
 * This converter processes the output from OpenAI's Responses API (both `create` and `parse` methods)
 * and transforms it into a LangChain AIMessage object with all relevant metadata, tool calls, and content.
 *
 * @param response - The response object from OpenAI's Responses API. Can be either:
 *   - ResponsesCreateInvoke: Result from `responses.create()`
 *   - ResponsesParseInvoke: Result from `responses.parse()`
 *
 * @returns An AIMessage containing:
 *   - `id`: The message ID from the response output
 *   - `content`: Array of message content blocks (text, images, etc.)
 *   - `tool_calls`: Array of successfully parsed tool calls
 *   - `invalid_tool_calls`: Array of tool calls that failed to parse
 *   - `usage_metadata`: Token usage information converted to LangChain format
 *   - `additional_kwargs`: Extra data including:
 *     - `refusal`: Refusal text if the model refused to respond
 *     - `reasoning`: Reasoning output for reasoning models
 *     - `tool_outputs`: Results from built-in tools (web search, file search, etc.)
 *     - `parsed`: Parsed structured output when using json_schema format
 *     - Function call ID mappings for tracking
 *   - `response_metadata`: Metadata about the response including model, timestamps, status, etc.
 *
 * @throws Error if the response contains an error object. The error message and code are extracted
 *   from the response.error field.
 *
 * @example
 * ```typescript
 * const response = await client.responses.create({
 *   model: "gpt-4",
 *   input: [{ type: "message", content: "Hello" }]
 * });
 * const message = convertResponsesMessageToAIMessage(response);
 * console.log(message.content); // Message content
 * console.log(message.tool_calls); // Any tool calls made
 * ```
 *
 * @remarks
 * The converter handles multiple output item types:
 * - `message`: Text and structured content from the model
 * - `function_call`: Tool/function calls that need to be executed
 * - `reasoning`: Reasoning traces from reasoning models (o1, o3, etc.)
 * - `custom_tool_call`: Custom tool invocations
 * - Built-in tool outputs: web_search, file_search, code_interpreter, etc.
 *
 * Tool calls are parsed and validated. Invalid tool calls (malformed JSON, etc.) are captured
 * in the `invalid_tool_calls` array rather than throwing errors.
 */
declare const convertResponsesMessageToAIMessage: Converter<ResponsesCreateInvoke | ResponsesParseInvoke, AIMessage>;
/**
 * Converts a LangChain ChatOpenAI reasoning summary to an OpenAI Responses API reasoning item.
 *
 * This converter transforms reasoning summaries that have been accumulated during streaming
 * (where summary parts may arrive in multiple chunks with the same index) into the final
 * consolidated format expected by OpenAI's Responses API. It combines summary parts that
 * share the same index and removes the index field from the final output.
 *
 * @param reasoning - A ChatOpenAI reasoning summary object containing:
 *   - `id`: The reasoning item ID
 *   - `type`: The type of reasoning (typically "reasoning")
 *   - `summary`: Array of summary parts, each with:
 *     - `text`: The summary text content
 *     - `type`: The summary type (e.g., "summary_text")
 *     - `index`: The index used to group related summary parts during streaming
 *
 * @returns An OpenAI Responses API ResponseReasoningItem with:
 *   - All properties from the input reasoning object
 *   - `summary`: Consolidated array of summary objects with:
 *     - `text`: Combined text from all parts with the same index
 *     - `type`: The summary type
 *     - No `index` field (removed after consolidation)
 *
 * @example
 * ```typescript
 * // Input: Reasoning summary with multiple parts at the same index
 * const reasoning = {
 *   id: "reasoning_123",
 *   type: "reasoning",
 *   summary: [
 *     { text: "First ", type: "summary_text", index: 0 },
 *     { text: "part", type: "summary_text", index: 0 },
 *     { text: "Second part", type: "summary_text", index: 1 }
 *   ]
 * };
 *
 * const result = convertReasoningSummaryToResponsesReasoningItem(reasoning);
 * // Returns:
 * // {
 * //   id: "reasoning_123",
 * //   type: "reasoning",
 * //   summary: [
 * //     { text: "First part", type: "summary_text" },
 * //     { text: "Second part", type: "summary_text" }
 * //   ]
 * // }
 * ```
 *
 * @remarks
 * - This converter is primarily used when reconstructing complete reasoning items from
 *   streaming chunks, where summary parts may arrive incrementally with index markers
 * - Summary parts with the same index are concatenated in the order they appear
 * - If the reasoning summary contains only one part, no reduction is performed
 * - The index field is used internally during streaming to track which summary parts
 *   belong together, but is removed from the final output as it's not part of the
 *   OpenAI Responses API schema
 * - This is the inverse operation of the streaming accumulation that happens in
 *   `convertResponsesDeltaToChatGenerationChunk`
 */
declare const convertReasoningSummaryToResponsesReasoningItem: Converter<ChatOpenAIReasoningSummary, OpenAI$1.Responses.ResponseReasoningItem>;
/**
 * Converts OpenAI Responses API stream events to LangChain ChatGenerationChunk objects.
 *
 * This converter processes streaming events from OpenAI's Responses API and transforms them
 * into LangChain ChatGenerationChunk objects that can be used in streaming chat applications.
 * It handles various event types including text deltas, tool calls, reasoning, and metadata updates.
 *
 * @param event - A streaming event from OpenAI's Responses API
 *
 * @returns A ChatGenerationChunk containing:
 *   - `text`: Concatenated text content from all text parts in the event
 *   - `message`: An AIMessageChunk with:
 *     - `id`: Message ID (set when a message output item is added)
 *     - `content`: Array of content blocks (text with optional annotations)
 *     - `tool_call_chunks`: Incremental tool call data (name, args, id)
 *     - `usage_metadata`: Token usage information (only in completion events)
 *     - `additional_kwargs`: Extra data including:
 *       - `refusal`: Refusal text if the model refused to respond
 *       - `reasoning`: Reasoning output for reasoning models (id, type, summary)
 *       - `tool_outputs`: Results from built-in tools (web search, file search, etc.)
 *       - `parsed`: Parsed structured output when using json_schema format
 *       - Function call ID mappings for tracking
 *     - `response_metadata`: Metadata about the response (model, id, etc.)
 *   - `generationInfo`: Additional generation information (e.g., tool output status)
 *
 *   Returns `null` for events that don't produce meaningful chunks:
 *   - Partial image generation events (to avoid storing all partial images in history)
 *   - Unrecognized event types
 *
 * @example
 * ```typescript
 * const stream = await client.responses.create({
 *   model: "gpt-4",
 *   input: [{ type: "message", content: "Hello" }],
 *   stream: true
 * });
 *
 * for await (const event of stream) {
 *   const chunk = convertResponsesDeltaToChatGenerationChunk(event);
 *   if (chunk) {
 *     console.log(chunk.text); // Incremental text
 *     console.log(chunk.message.tool_call_chunks); // Tool call updates
 *   }
 * }
 * ```
 *
 * @remarks
 * - Text content is accumulated in an array with index tracking for proper ordering
 * - Tool call chunks include incremental arguments that need to be concatenated by the consumer
 * - Reasoning summaries are built incrementally across multiple events
 * - Function call IDs are tracked in `additional_kwargs` to map call_id to item id
 * - The `text` field is provided for legacy compatibility with `onLLMNewToken` callbacks
 * - Usage metadata is only available in `response.completed` events
 * - Partial images are intentionally ignored to prevent memory bloat in conversation history
 */
declare const convertResponsesDeltaToChatGenerationChunk: Converter<OpenAI$1.Responses.ResponseStreamEvent, ChatGenerationChunk | null>;
/**
 * Converts a single LangChain BaseMessage to OpenAI Responses API input format.
 *
 * This converter transforms a LangChain message into one or more ResponseInputItem objects
 * that can be used with OpenAI's Responses API. It handles complex message structures including
 * tool calls, reasoning blocks, multimodal content, and various content block types.
 *
 * @param message - The LangChain BaseMessage to convert. Can be any message type including
 *   HumanMessage, AIMessage, SystemMessage, ToolMessage, etc.
 *
 * @returns An array of ResponseInputItem objects.
 *
 * @example
 * Basic text message conversion:
 * ```typescript
 * const message = new HumanMessage("Hello, how are you?");
 * const items = convertStandardContentMessageToResponsesInput(message);
 * // Returns: [{ type: "message", role: "user", content: [{ type: "input_text", text: "Hello, how are you?" }] }]
 * ```
 *
 * @example
 * AI message with tool calls:
 * ```typescript
 * const message = new AIMessage({
 *   content: "I'll check the weather for you.",
 *   tool_calls: [{
 *     id: "call_123",
 *     name: "get_weather",
 *     args: { location: "San Francisco" }
 *   }]
 * });
 * const items = convertStandardContentMessageToResponsesInput(message);
 * // Returns:
 * // [
 * //   { type: "message", role: "assistant", content: [{ type: "input_text", text: "I'll check the weather for you." }] },
 * //   { type: "function_call", call_id: "call_123", name: "get_weather", arguments: '{"location":"San Francisco"}' }
 * // ]
 * ```
 */
declare const convertStandardContentMessageToResponsesInput: Converter<BaseMessage, OpenAI$1.Responses.ResponseInputItem[]>;
/**
 * - MCP (Model Context Protocol) approval responses
 * - Zero Data Retention (ZDR) mode handling
 *
 * @param params - Conversion parameters
 * @param params.messages - Array of LangChain BaseMessages to convert
 * @param params.zdrEnabled - Whether Zero Data Retention mode is enabled. When true, certain
 *   metadata like message IDs and function call IDs are omitted from the output
 * @param params.model - The model name being used. Used to determine if special role mapping
 *   is needed (e.g., "system" -> "developer" for reasoning models)
 *
 * @returns Array of ResponsesInputItem objects formatted for the OpenAI Responses API
 *
 * @throws {Error} When a function message is encountered (not supported)
 * @throws {Error} When computer call output format is invalid
 *
 * @example
 * ```typescript
 * const messages = [
 *   new HumanMessage("Hello"),
 *   new AIMessage({ content: "Hi there!", tool_calls: [...] })
 * ];
 *
 * const input = convertMessagesToResponsesInput({
 *   messages,
 *   zdrEnabled: false,
 *   model: "gpt-4"
 * });
 * ```
 */
declare const convertMessagesToResponsesInput: Converter<{
  messages: BaseMessage[];
  zdrEnabled: boolean;
  model: string;
}, ResponsesInputItem[]>;
//#endregion
export { ResponsesCreate, ResponsesCreateInvoke, ResponsesInputItem, ResponsesParse, ResponsesParseInvoke, convertMessagesToResponsesInput, convertReasoningSummaryToResponsesReasoningItem, convertResponsesDeltaToChatGenerationChunk, convertResponsesMessageToAIMessage, convertResponsesUsageToUsageMetadata, convertStandardContentMessageToResponsesInput };
//# sourceMappingURL=responses.d.cts.map