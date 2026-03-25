import { OpenAI as OpenAI$1 } from "openai";
import { BaseMessage, BaseMessageChunk, ContentBlock, StandardContentBlockConverter } from "@langchain/core/messages";
import { Converter } from "@langchain/core/utils/format";
import { ChatCompletionContentPart, ChatCompletionContentPartImage, ChatCompletionContentPartInputAudio, ChatCompletionContentPartText } from "openai/resources/chat/completions";

//#region src/converters/completions.d.ts

/**
 * @deprecated This converter is an internal detail of the OpenAI provider. Do not use it directly. This will be revisited in a future release.
 */
declare const completionsApiContentBlockConverter: StandardContentBlockConverter<{
  text: ChatCompletionContentPartText;
  image: ChatCompletionContentPartImage;
  audio: ChatCompletionContentPartInputAudio;
  file: ChatCompletionContentPart.File;
}>;
/**
 * Converts an OpenAI Chat Completions API message to a LangChain BaseMessage.
 *
 * This converter transforms messages from OpenAI's Chat Completions API format into
 * LangChain's internal message representation, handling various message types and
 * preserving metadata, tool calls, and other relevant information.
 *
 * @remarks
 * The converter handles the following message roles:
 * - `assistant`: Converted to {@link AIMessage} with support for tool calls, function calls,
 *   audio content, and multi-modal outputs
 * - Other roles: Converted to generic {@link ChatMessage}
 *
 * For assistant messages, the converter:
 * - Parses and validates tool calls, separating valid and invalid calls
 * - Preserves function call information in additional_kwargs
 * - Includes usage statistics and system fingerprint in response_metadata
 * - Handles multi-modal content (text, images, audio)
 * - Optionally includes the raw API response for debugging
 *
 * @param params - Conversion parameters
 * @param params.message - The OpenAI chat completion message to convert
 * @param params.rawResponse - The complete raw response from OpenAI's API, used to extract
 *   metadata like model name, usage statistics, and system fingerprint
 * @param params.includeRawResponse - If true, includes the raw OpenAI response in the
 *   message's additional_kwargs under the `__raw_response` key. Useful for debugging
 *   or accessing provider-specific fields. Defaults to false.
 *
 * @returns A LangChain BaseMessage instance:
 *   - {@link AIMessage} for assistant messages with tool calls, metadata, and content
 *   - {@link ChatMessage} for all other message types
 *
 * @example
 * ```typescript
 * const baseMessage = convertCompletionsMessageToBaseMessage({
 *   message: {
 *     role: "assistant",
 *     content: "Hello! How can I help you?",
 *     tool_calls: [
 *       {
 *         id: "call_123",
 *         type: "function",
 *         function: { name: "get_weather", arguments: '{"location":"NYC"}' }
 *       }
 *     ]
 *   },
 *   rawResponse: completionResponse,
 *   includeRawResponse: true
 * });
 * // Returns an AIMessage with parsed tool calls and metadata
 * ```
 *
 * @throws {Error} If tool call parsing fails, the invalid tool call is captured in
 *   the `invalid_tool_calls` array rather than throwing an error
 *
 */
declare const convertCompletionsMessageToBaseMessage: Converter<{
  message: OpenAI$1.Chat.Completions.ChatCompletionMessage;
  rawResponse: OpenAI$1.Chat.Completions.ChatCompletion;
  includeRawResponse?: boolean;
}, BaseMessage>;
/**
 * Converts an OpenAI Chat Completions API delta (streaming chunk) to a LangChain BaseMessageChunk.
 *
 * This converter is used during streaming responses to transform incremental updates from OpenAI's
 * Chat Completions API into LangChain message chunks. It handles various message types, tool calls,
 * function calls, audio content, and role-specific message chunk creation.
 *
 * @param params - Conversion parameters
 * @param params.delta - The delta object from an OpenAI streaming chunk containing incremental
 *   message updates. May include content, role, tool_calls, function_call, audio, etc.
 * @param params.rawResponse - The complete raw ChatCompletionChunk response from OpenAI,
 *   containing metadata like model info, usage stats, and the delta
 * @param params.includeRawResponse - Optional flag to include the raw OpenAI response in the
 *   message chunk's additional_kwargs. Useful for debugging or accessing provider-specific data
 * @param params.defaultRole - Optional default role to use if the delta doesn't specify one.
 *   Typically used to maintain role consistency across chunks in a streaming response
 *
 * @returns A BaseMessageChunk subclass appropriate for the message role:
 *   - HumanMessageChunk for "user" role
 *   - AIMessageChunk for "assistant" role (includes tool call chunks)
 *   - SystemMessageChunk for "system" or "developer" roles
 *   - FunctionMessageChunk for "function" role
 *   - ToolMessageChunk for "tool" role
 *   - ChatMessageChunk for any other role
 *
 * @example
 * Basic streaming text chunk:
 * ```typescript
 * const chunk = convertCompletionsDeltaToBaseMessageChunk({
 *   delta: { role: "assistant", content: "Hello" },
 *   rawResponse: { id: "chatcmpl-123", model: "gpt-4", ... }
 * });
 * // Returns: AIMessageChunk with content "Hello"
 * ```
 *
 * @example
 * Streaming chunk with tool call:
 * ```typescript
 * const chunk = convertCompletionsDeltaToBaseMessageChunk({
 *   delta: {
 *     role: "assistant",
 *     tool_calls: [{
 *       index: 0,
 *       id: "call_123",
 *       function: { name: "get_weather", arguments: '{"location":' }
 *     }]
 *   },
 *   rawResponse: { id: "chatcmpl-123", ... }
 * });
 * // Returns: AIMessageChunk with tool_call_chunks containing partial tool call data
 * ```
 *
 * @remarks
 * - Tool calls are converted to ToolCallChunk objects with incremental data
 * - Audio content includes the chunk index from the raw response
 * - The "developer" role is mapped to SystemMessageChunk with a special marker
 * - Response metadata includes model provider info and usage statistics
 * - Function calls and tool calls are stored in additional_kwargs for compatibility
 */
declare const convertCompletionsDeltaToBaseMessageChunk: Converter<{
  delta: Record<string, any>;
  rawResponse: OpenAI$1.Chat.Completions.ChatCompletionChunk;
  includeRawResponse?: boolean;
  defaultRole?: OpenAI$1.Chat.ChatCompletionRole;
}, BaseMessageChunk>;
/**
 * Converts a standard LangChain content block to an OpenAI Completions API content part.
 *
 * This converter transforms LangChain's standardized content blocks (image, audio, file)
 * into the format expected by OpenAI's Chat Completions API. It handles various content
 * types including images (URL or base64), audio (base64), and files (data or file ID).
 *
 * @param block - The standard content block to convert. Can be an image, audio, or file block.
 *
 * @returns An OpenAI Chat Completions content part object, or undefined if the block
 *   cannot be converted (e.g., missing required data).
 *
 * @example
 * Image with URL:
 * ```typescript
 * const block = { type: "image", url: "https://example.com/image.jpg" };
 * const part = convertStandardContentBlockToCompletionsContentPart(block);
 * // Returns: { type: "image_url", image_url: { url: "https://example.com/image.jpg" } }
 * ```
 *
 * @example
 * Image with base64 data:
 * ```typescript
 * const block = { type: "image", data: "iVBORw0KGgo...", mimeType: "image/png" };
 * const part = convertStandardContentBlockToCompletionsContentPart(block);
 * // Returns: { type: "image_url", image_url: { url: "data:image/png;base64,iVBORw0KGgo..." } }
 * ```
 */
declare const convertStandardContentBlockToCompletionsContentPart: Converter<ContentBlock.Standard, OpenAI$1.Chat.Completions.ChatCompletionContentPartImage | OpenAI$1.Chat.Completions.ChatCompletionContentPartInputAudio | OpenAI$1.Chat.Completions.ChatCompletionContentPart.File | undefined>;
/**
 * Converts a LangChain BaseMessage with standard content blocks to an OpenAI Chat Completions API message parameter.
 *
 * This converter transforms LangChain's standardized message format (using contentBlocks) into the format
 * expected by OpenAI's Chat Completions API. It handles role mapping, content filtering, and multi-modal
 * content conversion for various message types.
 *
 * @remarks
 * The converter performs the following transformations:
 * - Maps LangChain message roles to OpenAI API roles (user, assistant, system, developer, tool, function)
 * - For reasoning models, automatically converts "system" role to "developer" role
 * - Filters content blocks based on message role (most roles only include text blocks)
 * - For user messages, converts multi-modal content blocks (images, audio, files) to OpenAI format
 * - Preserves tool call IDs for tool messages and function names for function messages
 *
 * Role-specific behavior:
 * - **developer**: Returns only text content blocks (used for reasoning models)
 * - **system**: Returns only text content blocks
 * - **assistant**: Returns only text content blocks
 * - **tool**: Returns only text content blocks with tool_call_id preserved
 * - **function**: Returns text content blocks joined as a single string with function name
 * - **user** (default): Returns multi-modal content including text, images, audio, and files
 *
 * @param params - Conversion parameters
 * @param params.message - The LangChain BaseMessage to convert. Must have contentBlocks property
 *   containing an array of standard content blocks (text, image, audio, file, etc.)
 * @param params.model - Optional model name. Used to determine if special role mapping is needed
 *   (e.g., "system" -> "developer" for reasoning models like o1)
 *
 * @returns An OpenAI ChatCompletionMessageParam object formatted for the Chat Completions API.
 *   The structure varies by role:
 *   - Developer/System/Assistant: `{ role, content: TextBlock[] }`
 *   - Tool: `{ role: "tool", tool_call_id, content: TextBlock[] }`
 *   - Function: `{ role: "function", name, content: string }`
 *   - User: `{ role: "user", content: Array<TextPart | ImagePart | AudioPart | FilePart> }`
 *
 * @example
 * Simple text message:
 * ```typescript
 * const message = new HumanMessage({
 *   content: [{ type: "text", text: "Hello!" }]
 * });
 * const param = convertStandardContentMessageToCompletionsMessage({ message });
 * // Returns: { role: "user", content: [{ type: "text", text: "Hello!" }] }
 * ```
 *
 * @example
 * Multi-modal user message with image:
 * ```typescript
 * const message = new HumanMessage({
 *   content: [
 *     { type: "text", text: "What's in this image?" },
 *     { type: "image", url: "https://example.com/image.jpg" }
 *   ]
 * });
 * const param = convertStandardContentMessageToCompletionsMessage({ message });
 * // Returns: {
 * //   role: "user",
 * //   content: [
 * //     { type: "text", text: "What's in this image?" },
 * //     { type: "image_url", image_url: { url: "https://example.com/image.jpg" } }
 * //   ]
 * // }
 * ```
 */
declare const convertStandardContentMessageToCompletionsMessage: Converter<{
  message: BaseMessage;
  model?: string;
}, OpenAI$1.Chat.Completions.ChatCompletionMessageParam>;
/**
 * Converts an array of LangChain BaseMessages to OpenAI Chat Completions API message parameters.
 *
 * This converter transforms LangChain's internal message representation into the format required
 * by OpenAI's Chat Completions API. It handles various message types, roles, content formats,
 * tool calls, function calls, audio messages, and special model-specific requirements.
 *
 * @remarks
 * The converter performs several key transformations:
 * - Maps LangChain message types to OpenAI roles (user, assistant, system, tool, function, developer)
 * - Converts standard content blocks (v1 format) using a specialized converter
 * - Handles multimodal content including text, images, audio, and data blocks
 * - Preserves tool calls and function calls with proper formatting
 * - Applies model-specific role mappings (e.g., "system" → "developer" for reasoning models)
 * - Splits audio messages into separate message parameters when needed
 *
 * @param params - Conversion parameters
 * @param params.messages - Array of LangChain BaseMessages to convert. Can include any message
 *   type: HumanMessage, AIMessage, SystemMessage, ToolMessage, FunctionMessage, etc.
 * @param params.model - Optional model name used to determine if special role mapping is needed.
 *   For reasoning models (o1, o3, etc.), "system" role is converted to "developer" role.
 *
 * @returns Array of ChatCompletionMessageParam objects formatted for OpenAI's Chat Completions API.
 *   Some messages may be split into multiple parameters (e.g., audio messages).
 *
 * @example
 * Basic message conversion:
 * ```typescript
 * const messages = [
 *   new HumanMessage("What's the weather like?"),
 *   new AIMessage("Let me check that for you.")
 * ];
 *
 * const params = convertMessagesToCompletionsMessageParams({
 *   messages,
 *   model: "gpt-4"
 * });
 * // Returns:
 * // [
 * //   { role: "user", content: "What's the weather like?" },
 * //   { role: "assistant", content: "Let me check that for you." }
 * // ]
 * ```
 *
 * @example
 * Message with tool calls:
 * ```typescript
 * const messages = [
 *   new AIMessage({
 *     content: "",
 *     tool_calls: [{
 *       id: "call_123",
 *       name: "get_weather",
 *       args: { location: "San Francisco" }
 *     }]
 *   })
 * ];
 *
 * const params = convertMessagesToCompletionsMessageParams({ messages });
 * // Returns:
 * // [{
 * //   role: "assistant",
 * //   content: "",
 * //   tool_calls: [{
 * //     id: "call_123",
 * //     type: "function",
 * //     function: { name: "get_weather", arguments: '{"location":"San Francisco"}' }
 * //   }]
 * // }]
 * ```
 */
declare const convertMessagesToCompletionsMessageParams: Converter<{
  messages: BaseMessage[];
  model?: string;
}, OpenAI$1.Chat.Completions.ChatCompletionMessageParam[]>;
//#endregion
export { completionsApiContentBlockConverter, convertCompletionsDeltaToBaseMessageChunk, convertCompletionsMessageToBaseMessage, convertMessagesToCompletionsMessageParams, convertStandardContentBlockToCompletionsContentPart, convertStandardContentMessageToCompletionsMessage };
//# sourceMappingURL=completions.d.ts.map