import { isReasoningModel, messageToOpenAIRole } from "../utils/misc.js";
import { handleMultiModalOutput } from "../utils/output.js";
import { AIMessage, AIMessageChunk, ChatMessage, ChatMessageChunk, FunctionMessageChunk, HumanMessageChunk, SystemMessageChunk, ToolMessage, ToolMessageChunk, convertToProviderContentBlock, iife, isDataContentBlock, parseBase64DataUrl, parseMimeType } from "@langchain/core/messages";
import { convertLangChainToolCallToOpenAI, makeInvalidToolCall, parseToolCall } from "@langchain/core/output_parsers/openai_tools";

//#region src/converters/completions.ts
/**
* @deprecated This converter is an internal detail of the OpenAI provider. Do not use it directly. This will be revisited in a future release.
*/
const completionsApiContentBlockConverter = {
	providerName: "ChatOpenAI",
	fromStandardTextBlock(block) {
		return {
			type: "text",
			text: block.text
		};
	},
	fromStandardImageBlock(block) {
		if (block.source_type === "url") return {
			type: "image_url",
			image_url: {
				url: block.url,
				...block.metadata?.detail ? { detail: block.metadata.detail } : {}
			}
		};
		if (block.source_type === "base64") {
			const url = `data:${block.mime_type ?? ""};base64,${block.data}`;
			return {
				type: "image_url",
				image_url: {
					url,
					...block.metadata?.detail ? { detail: block.metadata.detail } : {}
				}
			};
		}
		throw new Error(`Image content blocks with source_type ${block.source_type} are not supported for ChatOpenAI`);
	},
	fromStandardAudioBlock(block) {
		if (block.source_type === "url") {
			const data = parseBase64DataUrl({ dataUrl: block.url });
			if (!data) throw new Error(`URL audio blocks with source_type ${block.source_type} must be formatted as a data URL for ChatOpenAI`);
			const rawMimeType = data.mime_type || block.mime_type || "";
			let mimeType;
			try {
				mimeType = parseMimeType(rawMimeType);
			} catch {
				throw new Error(`Audio blocks with source_type ${block.source_type} must have mime type of audio/wav or audio/mp3`);
			}
			if (mimeType.type !== "audio" || mimeType.subtype !== "wav" && mimeType.subtype !== "mp3") throw new Error(`Audio blocks with source_type ${block.source_type} must have mime type of audio/wav or audio/mp3`);
			return {
				type: "input_audio",
				input_audio: {
					format: mimeType.subtype,
					data: data.data
				}
			};
		}
		if (block.source_type === "base64") {
			let mimeType;
			try {
				mimeType = parseMimeType(block.mime_type ?? "");
			} catch {
				throw new Error(`Audio blocks with source_type ${block.source_type} must have mime type of audio/wav or audio/mp3`);
			}
			if (mimeType.type !== "audio" || mimeType.subtype !== "wav" && mimeType.subtype !== "mp3") throw new Error(`Audio blocks with source_type ${block.source_type} must have mime type of audio/wav or audio/mp3`);
			return {
				type: "input_audio",
				input_audio: {
					format: mimeType.subtype,
					data: block.data
				}
			};
		}
		throw new Error(`Audio content blocks with source_type ${block.source_type} are not supported for ChatOpenAI`);
	},
	fromStandardFileBlock(block) {
		if (block.source_type === "url") {
			const data = parseBase64DataUrl({ dataUrl: block.url });
			if (!data) throw new Error(`URL file blocks with source_type ${block.source_type} must be formatted as a data URL for ChatOpenAI`);
			return {
				type: "file",
				file: {
					file_data: block.url,
					...block.metadata?.filename || block.metadata?.name ? { filename: block.metadata?.filename || block.metadata?.name } : {}
				}
			};
		}
		if (block.source_type === "base64") return {
			type: "file",
			file: {
				file_data: `data:${block.mime_type ?? ""};base64,${block.data}`,
				...block.metadata?.filename || block.metadata?.name || block.metadata?.title ? { filename: block.metadata?.filename || block.metadata?.name || block.metadata?.title } : {}
			}
		};
		if (block.source_type === "id") return {
			type: "file",
			file: { file_id: block.id }
		};
		throw new Error(`File content blocks with source_type ${block.source_type} are not supported for ChatOpenAI`);
	}
};
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
const convertCompletionsMessageToBaseMessage = ({ message, rawResponse, includeRawResponse }) => {
	const rawToolCalls = message.tool_calls;
	switch (message.role) {
		case "assistant": {
			const toolCalls = [];
			const invalidToolCalls = [];
			for (const rawToolCall of rawToolCalls ?? []) try {
				toolCalls.push(parseToolCall(rawToolCall, { returnId: true }));
			} catch (e) {
				invalidToolCalls.push(makeInvalidToolCall(rawToolCall, e.message));
			}
			const additional_kwargs = {
				function_call: message.function_call,
				tool_calls: rawToolCalls
			};
			if (includeRawResponse !== void 0) additional_kwargs.__raw_response = rawResponse;
			const response_metadata = {
				model_provider: "openai",
				model_name: rawResponse.model,
				...rawResponse.system_fingerprint ? {
					usage: { ...rawResponse.usage },
					system_fingerprint: rawResponse.system_fingerprint
				} : {}
			};
			if (message.audio) additional_kwargs.audio = message.audio;
			const content = handleMultiModalOutput(message.content || "", rawResponse.choices?.[0]?.message);
			return new AIMessage({
				content,
				tool_calls: toolCalls,
				invalid_tool_calls: invalidToolCalls,
				additional_kwargs,
				response_metadata,
				id: rawResponse.id
			});
		}
		default: return new ChatMessage(message.content || "", message.role ?? "unknown");
	}
};
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
const convertCompletionsDeltaToBaseMessageChunk = ({ delta, rawResponse, includeRawResponse, defaultRole }) => {
	const role = delta.role ?? defaultRole;
	const content = delta.content ?? "";
	let additional_kwargs;
	if (delta.function_call) additional_kwargs = { function_call: delta.function_call };
	else if (delta.tool_calls) additional_kwargs = { tool_calls: delta.tool_calls };
	else additional_kwargs = {};
	if (includeRawResponse) additional_kwargs.__raw_response = rawResponse;
	if (delta.audio) additional_kwargs.audio = {
		...delta.audio,
		index: rawResponse.choices[0].index
	};
	const response_metadata = {
		model_provider: "openai",
		usage: { ...rawResponse.usage }
	};
	if (role === "user") return new HumanMessageChunk({
		content,
		response_metadata
	});
	else if (role === "assistant") {
		const toolCallChunks = [];
		if (Array.isArray(delta.tool_calls)) for (const rawToolCall of delta.tool_calls) toolCallChunks.push({
			name: rawToolCall.function?.name,
			args: rawToolCall.function?.arguments,
			id: rawToolCall.id,
			index: rawToolCall.index,
			type: "tool_call_chunk"
		});
		return new AIMessageChunk({
			content,
			tool_call_chunks: toolCallChunks,
			additional_kwargs,
			id: rawResponse.id,
			response_metadata
		});
	} else if (role === "system") return new SystemMessageChunk({
		content,
		response_metadata
	});
	else if (role === "developer") return new SystemMessageChunk({
		content,
		response_metadata,
		additional_kwargs: { __openai_role__: "developer" }
	});
	else if (role === "function") return new FunctionMessageChunk({
		content,
		additional_kwargs,
		name: delta.name,
		response_metadata
	});
	else if (role === "tool") return new ToolMessageChunk({
		content,
		additional_kwargs,
		tool_call_id: delta.tool_call_id,
		response_metadata
	});
	else return new ChatMessageChunk({
		content,
		role,
		response_metadata
	});
};
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
const convertStandardContentBlockToCompletionsContentPart = (block) => {
	if (block.type === "image") {
		if (block.url) return {
			type: "image_url",
			image_url: { url: block.url }
		};
		else if (block.data) return {
			type: "image_url",
			image_url: { url: `data:${block.mimeType};base64,${block.data}` }
		};
	}
	if (block.type === "audio") {
		if (block.data) {
			const format = iife(() => {
				const [, format$1] = block.mimeType.split("/");
				if (format$1 === "wav" || format$1 === "mp3") return format$1;
				return "wav";
			});
			return {
				type: "input_audio",
				input_audio: {
					data: block.data.toString(),
					format
				}
			};
		}
	}
	if (block.type === "file") {
		if (block.data) return {
			type: "file",
			file: { file_data: block.data.toString() }
		};
		if (block.fileId) return {
			type: "file",
			file: { file_id: block.fileId }
		};
	}
	return void 0;
};
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
const convertStandardContentMessageToCompletionsMessage = ({ message, model }) => {
	let role = messageToOpenAIRole(message);
	if (role === "system" && isReasoningModel(model)) role = "developer";
	if (role === "developer") return {
		role: "developer",
		content: message.contentBlocks.filter((block) => block.type === "text")
	};
	else if (role === "system") return {
		role: "system",
		content: message.contentBlocks.filter((block) => block.type === "text")
	};
	else if (role === "assistant") return {
		role: "assistant",
		content: message.contentBlocks.filter((block) => block.type === "text")
	};
	else if (role === "tool" && ToolMessage.isInstance(message)) return {
		role: "tool",
		tool_call_id: message.tool_call_id,
		content: message.contentBlocks.filter((block) => block.type === "text")
	};
	else if (role === "function") return {
		role: "function",
		name: message.name ?? "",
		content: message.contentBlocks.filter((block) => block.type === "text").join("")
	};
	function* iterateUserContent(blocks) {
		for (const block of blocks) {
			if (block.type === "text") yield {
				type: "text",
				text: block.text
			};
			const data = convertStandardContentBlockToCompletionsContentPart(block);
			if (data) yield data;
		}
	}
	return {
		role: "user",
		content: Array.from(iterateUserContent(message.contentBlocks))
	};
};
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
const convertMessagesToCompletionsMessageParams = ({ messages, model }) => {
	return messages.flatMap((message) => {
		if ("output_version" in message.response_metadata && message.response_metadata?.output_version === "v1") return convertStandardContentMessageToCompletionsMessage({ message });
		let role = messageToOpenAIRole(message);
		if (role === "system" && isReasoningModel(model)) role = "developer";
		const content = typeof message.content === "string" ? message.content : message.content.map((m) => {
			if (isDataContentBlock(m)) return convertToProviderContentBlock(m, completionsApiContentBlockConverter);
			return m;
		});
		const completionParam = {
			role,
			content
		};
		if (message.name != null) completionParam.name = message.name;
		if (message.additional_kwargs.function_call != null) {
			completionParam.function_call = message.additional_kwargs.function_call;
			completionParam.content = "";
		}
		if (AIMessage.isInstance(message) && !!message.tool_calls?.length) {
			completionParam.tool_calls = message.tool_calls.map(convertLangChainToolCallToOpenAI);
			completionParam.content = "";
		} else {
			if (message.additional_kwargs.tool_calls != null) completionParam.tool_calls = message.additional_kwargs.tool_calls;
			if (ToolMessage.isInstance(message) && message.tool_call_id != null) completionParam.tool_call_id = message.tool_call_id;
		}
		if (message.additional_kwargs.audio && typeof message.additional_kwargs.audio === "object" && "id" in message.additional_kwargs.audio) {
			const audioMessage = {
				role: "assistant",
				audio: { id: message.additional_kwargs.audio.id }
			};
			return [completionParam, audioMessage];
		}
		return completionParam;
	});
};

//#endregion
export { completionsApiContentBlockConverter, convertCompletionsDeltaToBaseMessageChunk, convertCompletionsMessageToBaseMessage, convertMessagesToCompletionsMessageParams, convertStandardContentBlockToCompletionsContentPart, convertStandardContentMessageToCompletionsMessage };
//# sourceMappingURL=completions.js.map