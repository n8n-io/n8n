const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_tools = require('../utils/tools.cjs');
const require_misc = require('../utils/misc.cjs');
const require_completions = require('./completions.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_outputs = require_rolldown_runtime.__toESM(require("@langchain/core/outputs"));
const __langchain_core_output_parsers_openai_tools = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers/openai_tools"));

//#region src/converters/responses.ts
const _FUNCTION_CALL_IDS_MAP_KEY = "__openai_function_call_ids__";
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
const convertResponsesUsageToUsageMetadata = (usage) => {
	const inputTokenDetails = { ...usage?.input_tokens_details?.cached_tokens != null && { cache_read: usage?.input_tokens_details?.cached_tokens } };
	const outputTokenDetails = { ...usage?.output_tokens_details?.reasoning_tokens != null && { reasoning: usage?.output_tokens_details?.reasoning_tokens } };
	return {
		input_tokens: usage?.input_tokens ?? 0,
		output_tokens: usage?.output_tokens ?? 0,
		total_tokens: usage?.total_tokens ?? 0,
		input_token_details: inputTokenDetails,
		output_token_details: outputTokenDetails
	};
};
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
const convertResponsesMessageToAIMessage = (response) => {
	if (response.error) {
		const error = new Error(response.error.message);
		error.name = response.error.code;
		throw error;
	}
	let messageId;
	const content = [];
	const tool_calls = [];
	const invalid_tool_calls = [];
	const response_metadata = {
		model_provider: "openai",
		model: response.model,
		created_at: response.created_at,
		id: response.id,
		incomplete_details: response.incomplete_details,
		metadata: response.metadata,
		object: response.object,
		status: response.status,
		user: response.user,
		service_tier: response.service_tier,
		model_name: response.model
	};
	const additional_kwargs = {};
	for (const item of response.output) if (item.type === "message") {
		messageId = item.id;
		content.push(...item.content.flatMap((part) => {
			if (part.type === "output_text") {
				if ("parsed" in part && part.parsed != null) additional_kwargs.parsed = part.parsed;
				return {
					type: "text",
					text: part.text,
					annotations: part.annotations
				};
			}
			if (part.type === "refusal") {
				additional_kwargs.refusal = part.refusal;
				return [];
			}
			return part;
		}));
	} else if (item.type === "function_call") {
		const fnAdapter = {
			function: {
				name: item.name,
				arguments: item.arguments
			},
			id: item.call_id
		};
		try {
			tool_calls.push((0, __langchain_core_output_parsers_openai_tools.parseToolCall)(fnAdapter, { returnId: true }));
		} catch (e) {
			let errMessage;
			if (typeof e === "object" && e != null && "message" in e && typeof e.message === "string") errMessage = e.message;
			invalid_tool_calls.push((0, __langchain_core_output_parsers_openai_tools.makeInvalidToolCall)(fnAdapter, errMessage));
		}
		additional_kwargs[_FUNCTION_CALL_IDS_MAP_KEY] ??= {};
		if (item.id) additional_kwargs[_FUNCTION_CALL_IDS_MAP_KEY][item.call_id] = item.id;
	} else if (item.type === "reasoning") additional_kwargs.reasoning = item;
	else if (item.type === "custom_tool_call") {
		const parsed = require_tools.parseCustomToolCall(item);
		if (parsed) tool_calls.push(parsed);
		else invalid_tool_calls.push((0, __langchain_core_output_parsers_openai_tools.makeInvalidToolCall)(item, "Malformed custom tool call"));
	} else {
		additional_kwargs.tool_outputs ??= [];
		additional_kwargs.tool_outputs.push(item);
	}
	return new __langchain_core_messages.AIMessage({
		id: messageId,
		content,
		tool_calls,
		invalid_tool_calls,
		usage_metadata: convertResponsesUsageToUsageMetadata(response.usage),
		additional_kwargs,
		response_metadata
	});
};
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
const convertReasoningSummaryToResponsesReasoningItem = (reasoning) => {
	const summary = (reasoning.summary.length > 1 ? reasoning.summary.reduce((acc, curr) => {
		const last = acc[acc.length - 1];
		if (last.index === curr.index) last.text += curr.text;
		else acc.push(curr);
		return acc;
	}, [{ ...reasoning.summary[0] }]) : reasoning.summary).map((s) => Object.fromEntries(Object.entries(s).filter(([k]) => k !== "index")));
	return {
		...reasoning,
		summary
	};
};
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
const convertResponsesDeltaToChatGenerationChunk = (event) => {
	const content = [];
	let generationInfo = {};
	let usage_metadata;
	const tool_call_chunks = [];
	const response_metadata = { model_provider: "openai" };
	const additional_kwargs = {};
	let id;
	if (event.type === "response.output_text.delta") content.push({
		type: "text",
		text: event.delta,
		index: event.content_index
	});
	else if (event.type === "response.output_text.annotation.added") content.push({
		type: "text",
		text: "",
		annotations: [event.annotation],
		index: event.content_index
	});
	else if (event.type === "response.output_item.added" && event.item.type === "message") id = event.item.id;
	else if (event.type === "response.output_item.added" && event.item.type === "function_call") {
		tool_call_chunks.push({
			type: "tool_call_chunk",
			name: event.item.name,
			args: event.item.arguments,
			id: event.item.call_id,
			index: event.output_index
		});
		additional_kwargs[_FUNCTION_CALL_IDS_MAP_KEY] = { [event.item.call_id]: event.item.id };
	} else if (event.type === "response.output_item.done" && [
		"web_search_call",
		"file_search_call",
		"computer_call",
		"code_interpreter_call",
		"mcp_call",
		"mcp_list_tools",
		"mcp_approval_request",
		"image_generation_call",
		"custom_tool_call"
	].includes(event.item.type)) additional_kwargs.tool_outputs = [event.item];
	else if (event.type === "response.created") {
		response_metadata.id = event.response.id;
		response_metadata.model_name = event.response.model;
		response_metadata.model = event.response.model;
	} else if (event.type === "response.completed") {
		const msg = convertResponsesMessageToAIMessage(event.response);
		usage_metadata = convertResponsesUsageToUsageMetadata(event.response.usage);
		if (event.response.text?.format?.type === "json_schema") additional_kwargs.parsed ??= JSON.parse(msg.text);
		for (const [key, value] of Object.entries(event.response)) if (key !== "id") response_metadata[key] = value;
	} else if (event.type === "response.function_call_arguments.delta" || event.type === "response.custom_tool_call_input.delta") tool_call_chunks.push({
		type: "tool_call_chunk",
		args: event.delta,
		index: event.output_index
	});
	else if (event.type === "response.web_search_call.completed" || event.type === "response.file_search_call.completed") generationInfo = { tool_outputs: {
		id: event.item_id,
		type: event.type.replace("response.", "").replace(".completed", ""),
		status: "completed"
	} };
	else if (event.type === "response.refusal.done") additional_kwargs.refusal = event.refusal;
	else if (event.type === "response.output_item.added" && "item" in event && event.item.type === "reasoning") {
		const summary = event.item.summary ? event.item.summary.map((s, index) => ({
			...s,
			index
		})) : void 0;
		additional_kwargs.reasoning = {
			id: event.item.id,
			type: event.item.type,
			...summary ? { summary } : {}
		};
	} else if (event.type === "response.reasoning_summary_part.added") additional_kwargs.reasoning = {
		type: "reasoning",
		summary: [{
			...event.part,
			index: event.summary_index
		}]
	};
	else if (event.type === "response.reasoning_summary_text.delta") additional_kwargs.reasoning = {
		type: "reasoning",
		summary: [{
			text: event.delta,
			type: "summary_text",
			index: event.summary_index
		}]
	};
	else if (event.type === "response.image_generation_call.partial_image") return null;
	else return null;
	return new __langchain_core_outputs.ChatGenerationChunk({
		text: content.map((part) => part.text).join(""),
		message: new __langchain_core_messages.AIMessageChunk({
			id,
			content,
			tool_call_chunks,
			usage_metadata,
			additional_kwargs,
			response_metadata
		}),
		generationInfo
	});
};
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
const convertStandardContentMessageToResponsesInput = (message) => {
	const isResponsesMessage = __langchain_core_messages.AIMessage.isInstance(message) && message.response_metadata?.model_provider === "openai";
	function* iterateItems() {
		const messageRole = require_misc.iife(() => {
			try {
				const role = require_misc.messageToOpenAIRole(message);
				if (role === "system" || role === "developer" || role === "assistant" || role === "user") return role;
				return "assistant";
			} catch {
				return "assistant";
			}
		});
		let currentMessage = void 0;
		const functionCallIdsWithBlocks = /* @__PURE__ */ new Set();
		const serverFunctionCallIdsWithBlocks = /* @__PURE__ */ new Set();
		const pendingFunctionChunks = /* @__PURE__ */ new Map();
		const pendingServerFunctionChunks = /* @__PURE__ */ new Map();
		function* flushMessage() {
			if (!currentMessage) return;
			const content = currentMessage.content;
			if (typeof content === "string" && content.length > 0 || Array.isArray(content) && content.length > 0) yield currentMessage;
			currentMessage = void 0;
		}
		const pushMessageContent = (content) => {
			if (!currentMessage) currentMessage = {
				type: "message",
				role: messageRole,
				content: []
			};
			if (typeof currentMessage.content === "string") currentMessage.content = currentMessage.content.length > 0 ? [{
				type: "input_text",
				text: currentMessage.content
			}, ...content] : [...content];
			else currentMessage.content.push(...content);
		};
		const toJsonString = (value) => {
			if (typeof value === "string") return value;
			try {
				return JSON.stringify(value ?? {});
			} catch {
				return "{}";
			}
		};
		const resolveImageItem = (block) => {
			const detail = require_misc.iife(() => {
				const raw = block.metadata?.detail;
				if (raw === "low" || raw === "high" || raw === "auto") return raw;
				return "auto";
			});
			if (block.fileId) return {
				type: "input_image",
				detail,
				file_id: block.fileId
			};
			if (block.url) return {
				type: "input_image",
				detail,
				image_url: block.url
			};
			if (block.data) {
				const base64Data = typeof block.data === "string" ? block.data : Buffer.from(block.data).toString("base64");
				const mimeType = block.mimeType ?? "image/png";
				return {
					type: "input_image",
					detail,
					image_url: `data:${mimeType};base64,${base64Data}`
				};
			}
			return void 0;
		};
		const resolveFileItem = (block) => {
			const filename = block.metadata?.filename ?? block.metadata?.name ?? block.metadata?.title;
			if (block.fileId && typeof filename === "string") return {
				type: "input_file",
				file_id: block.fileId,
				...filename ? { filename } : {}
			};
			if (block.url && typeof filename === "string") return {
				type: "input_file",
				file_url: block.url,
				...filename ? { filename } : {}
			};
			if (block.data && typeof filename === "string") {
				const encoded = typeof block.data === "string" ? block.data : Buffer.from(block.data).toString("base64");
				const mimeType = block.mimeType ?? "application/octet-stream";
				return {
					type: "input_file",
					file_data: `data:${mimeType};base64,${encoded}`,
					...filename ? { filename } : {}
				};
			}
			return void 0;
		};
		const convertReasoningBlock = (block) => {
			const summaryEntries = require_misc.iife(() => {
				if (Array.isArray(block.summary)) {
					const candidate = block.summary;
					const mapped = candidate?.map((item) => item?.text).filter((text) => typeof text === "string") ?? [];
					if (mapped.length > 0) return mapped;
				}
				return block.reasoning ? [block.reasoning] : [];
			});
			const summary = summaryEntries.length > 0 ? summaryEntries.map((text) => ({
				type: "summary_text",
				text
			})) : [{
				type: "summary_text",
				text: ""
			}];
			const reasoningItem = {
				type: "reasoning",
				id: block.id ?? "",
				summary
			};
			if (block.reasoning) reasoningItem.content = [{
				type: "reasoning_text",
				text: block.reasoning
			}];
			return reasoningItem;
		};
		const convertFunctionCall = (block) => ({
			type: "function_call",
			name: block.name ?? "",
			call_id: block.id ?? "",
			arguments: toJsonString(block.args)
		});
		const convertFunctionCallOutput = (block) => {
			const output = toJsonString(block.output);
			const status = block.status === "success" ? "completed" : block.status === "error" ? "incomplete" : void 0;
			return {
				type: "function_call_output",
				call_id: block.toolCallId ?? "",
				output,
				...status ? { status } : {}
			};
		};
		for (const block of message.contentBlocks) if (block.type === "text") pushMessageContent([{
			type: "input_text",
			text: block.text
		}]);
		else if (block.type === "invalid_tool_call") {} else if (block.type === "reasoning") {
			yield* flushMessage();
			yield convertReasoningBlock(block);
		} else if (block.type === "tool_call") {
			yield* flushMessage();
			const id = block.id ?? "";
			if (id) {
				functionCallIdsWithBlocks.add(id);
				pendingFunctionChunks.delete(id);
			}
			yield convertFunctionCall(block);
		} else if (block.type === "tool_call_chunk") {
			if (block.id) {
				const existing = pendingFunctionChunks.get(block.id) ?? {
					name: block.name,
					args: []
				};
				if (block.name) existing.name = block.name;
				if (block.args) existing.args.push(block.args);
				pendingFunctionChunks.set(block.id, existing);
			}
		} else if (block.type === "server_tool_call") {
			yield* flushMessage();
			const id = block.id ?? "";
			if (id) {
				serverFunctionCallIdsWithBlocks.add(id);
				pendingServerFunctionChunks.delete(id);
			}
			yield convertFunctionCall(block);
		} else if (block.type === "server_tool_call_chunk") {
			if (block.id) {
				const existing = pendingServerFunctionChunks.get(block.id) ?? {
					name: block.name,
					args: []
				};
				if (block.name) existing.name = block.name;
				if (block.args) existing.args.push(block.args);
				pendingServerFunctionChunks.set(block.id, existing);
			}
		} else if (block.type === "server_tool_call_result") {
			yield* flushMessage();
			yield convertFunctionCallOutput(block);
		} else if (block.type === "audio") {} else if (block.type === "file") {
			const fileItem = resolveFileItem(block);
			if (fileItem) pushMessageContent([fileItem]);
		} else if (block.type === "image") {
			const imageItem = resolveImageItem(block);
			if (imageItem) pushMessageContent([imageItem]);
		} else if (block.type === "video") {
			const videoItem = resolveFileItem(block);
			if (videoItem) pushMessageContent([videoItem]);
		} else if (block.type === "text-plain") {
			if (block.text) pushMessageContent([{
				type: "input_text",
				text: block.text
			}]);
		} else if (block.type === "non_standard" && isResponsesMessage) {
			yield* flushMessage();
			yield block.value;
		}
		yield* flushMessage();
		for (const [id, chunk] of pendingFunctionChunks) {
			if (!id || functionCallIdsWithBlocks.has(id)) continue;
			const args = chunk.args.join("");
			if (!chunk.name && !args) continue;
			yield {
				type: "function_call",
				call_id: id,
				name: chunk.name ?? "",
				arguments: args
			};
		}
		for (const [id, chunk] of pendingServerFunctionChunks) {
			if (!id || serverFunctionCallIdsWithBlocks.has(id)) continue;
			const args = chunk.args.join("");
			if (!chunk.name && !args) continue;
			yield {
				type: "function_call",
				call_id: id,
				name: chunk.name ?? "",
				arguments: args
			};
		}
	}
	return Array.from(iterateItems());
};
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
const convertMessagesToResponsesInput = ({ messages, zdrEnabled, model }) => {
	return messages.flatMap((lcMsg) => {
		const responseMetadata = lcMsg.response_metadata;
		if (responseMetadata?.output_version === "v1") return convertStandardContentMessageToResponsesInput(lcMsg);
		const additional_kwargs = lcMsg.additional_kwargs;
		let role = require_misc.messageToOpenAIRole(lcMsg);
		if (role === "system" && require_misc.isReasoningModel(model)) role = "developer";
		if (role === "function") throw new Error("Function messages are not supported in Responses API");
		if (role === "tool") {
			const toolMessage = lcMsg;
			if (additional_kwargs?.type === "computer_call_output") {
				const output = (() => {
					if (typeof toolMessage.content === "string") return {
						type: "computer_screenshot",
						image_url: toolMessage.content
					};
					if (Array.isArray(toolMessage.content)) {
						const oaiScreenshot = toolMessage.content.find((i) => i.type === "computer_screenshot");
						if (oaiScreenshot) return oaiScreenshot;
						const lcImage = toolMessage.content.find((i) => i.type === "image_url");
						if (lcImage) return {
							type: "computer_screenshot",
							image_url: typeof lcImage.image_url === "string" ? lcImage.image_url : lcImage.image_url.url
						};
					}
					throw new Error("Invalid computer call output");
				})();
				return {
					type: "computer_call_output",
					output,
					call_id: toolMessage.tool_call_id
				};
			}
			if (toolMessage.additional_kwargs?.customTool) return {
				type: "custom_tool_call_output",
				call_id: toolMessage.tool_call_id,
				output: toolMessage.content
			};
			return {
				type: "function_call_output",
				call_id: toolMessage.tool_call_id,
				id: toolMessage.id?.startsWith("fc_") ? toolMessage.id : void 0,
				output: typeof toolMessage.content !== "string" ? JSON.stringify(toolMessage.content) : toolMessage.content
			};
		}
		if (role === "assistant") {
			if (!zdrEnabled && responseMetadata?.output != null && Array.isArray(responseMetadata?.output) && responseMetadata?.output.length > 0 && responseMetadata?.output.every((item) => "type" in item)) return responseMetadata?.output;
			const input = [];
			if (additional_kwargs?.reasoning && !zdrEnabled) {
				const reasoningItem = convertReasoningSummaryToResponsesReasoningItem(additional_kwargs.reasoning);
				input.push(reasoningItem);
			}
			let { content } = lcMsg;
			if (additional_kwargs?.refusal) {
				if (typeof content === "string") content = [{
					type: "output_text",
					text: content,
					annotations: []
				}];
				content = [...content, {
					type: "refusal",
					refusal: additional_kwargs.refusal
				}];
			}
			if (typeof content === "string" || content.length > 0) input.push({
				type: "message",
				role: "assistant",
				...lcMsg.id && !zdrEnabled && lcMsg.id.startsWith("msg_") ? { id: lcMsg.id } : {},
				content: require_misc.iife(() => {
					if (typeof content === "string") return content;
					return content.flatMap((item) => {
						if (item.type === "text") return {
							type: "output_text",
							text: item.text,
							annotations: item.annotations ?? []
						};
						if (item.type === "output_text" || item.type === "refusal") return item;
						return [];
					});
				})
			});
			const functionCallIds = additional_kwargs?.[_FUNCTION_CALL_IDS_MAP_KEY];
			if (__langchain_core_messages.AIMessage.isInstance(lcMsg) && !!lcMsg.tool_calls?.length) input.push(...lcMsg.tool_calls.map((toolCall) => {
				if (require_tools.isCustomToolCall(toolCall)) return {
					type: "custom_tool_call",
					id: toolCall.call_id,
					call_id: toolCall.id ?? "",
					input: toolCall.args.input,
					name: toolCall.name
				};
				return {
					type: "function_call",
					name: toolCall.name,
					arguments: JSON.stringify(toolCall.args),
					call_id: toolCall.id,
					...!zdrEnabled ? { id: functionCallIds?.[toolCall.id] } : {}
				};
			}));
			else if (additional_kwargs?.tool_calls) input.push(...additional_kwargs.tool_calls.map((toolCall) => ({
				type: "function_call",
				name: toolCall.function.name,
				call_id: toolCall.id,
				arguments: toolCall.function.arguments,
				...!zdrEnabled ? { id: functionCallIds?.[toolCall.id] } : {}
			})));
			const toolOutputs = (responseMetadata?.output)?.length ? responseMetadata?.output : additional_kwargs.tool_outputs;
			const fallthroughCallTypes = [
				"computer_call",
				"mcp_call",
				"code_interpreter_call",
				"image_generation_call"
			];
			if (toolOutputs != null) {
				const castToolOutputs = toolOutputs;
				const fallthroughCalls = castToolOutputs?.filter((item) => fallthroughCallTypes.includes(item.type));
				if (fallthroughCalls.length > 0) input.push(...fallthroughCalls);
			}
			return input;
		}
		if (role === "user" || role === "system" || role === "developer") {
			if (typeof lcMsg.content === "string") return {
				type: "message",
				role,
				content: lcMsg.content
			};
			const messages$1 = [];
			const content = lcMsg.content.flatMap((item) => {
				if (item.type === "mcp_approval_response") messages$1.push({
					type: "mcp_approval_response",
					approval_request_id: item.approval_request_id,
					approve: item.approve
				});
				if ((0, __langchain_core_messages.isDataContentBlock)(item)) return (0, __langchain_core_messages.convertToProviderContentBlock)(item, require_completions.completionsApiContentBlockConverter);
				if (item.type === "text") return {
					type: "input_text",
					text: item.text
				};
				if (item.type === "image_url") {
					const imageUrl = require_misc.iife(() => {
						if (typeof item.image_url === "string") return item.image_url;
						else if (typeof item.image_url === "object" && item.image_url !== null && "url" in item.image_url) return item.image_url.url;
						return void 0;
					});
					const detail = require_misc.iife(() => {
						if (typeof item.image_url === "string") return "auto";
						else if (typeof item.image_url === "object" && item.image_url !== null && "detail" in item.image_url) return item.image_url.detail;
						return void 0;
					});
					return {
						type: "input_image",
						image_url: imageUrl,
						detail
					};
				}
				if (item.type === "input_text" || item.type === "input_image" || item.type === "input_file") return item;
				return [];
			});
			if (content.length > 0) messages$1.push({
				type: "message",
				role,
				content
			});
			return messages$1;
		}
		console.warn(`Unsupported role found when converting to OpenAI Responses API: ${role}`);
		return [];
	});
};

//#endregion
exports.convertMessagesToResponsesInput = convertMessagesToResponsesInput;
exports.convertReasoningSummaryToResponsesReasoningItem = convertReasoningSummaryToResponsesReasoningItem;
exports.convertResponsesDeltaToChatGenerationChunk = convertResponsesDeltaToChatGenerationChunk;
exports.convertResponsesMessageToAIMessage = convertResponsesMessageToAIMessage;
exports.convertResponsesUsageToUsageMetadata = convertResponsesUsageToUsageMetadata;
exports.convertStandardContentMessageToResponsesInput = convertStandardContentMessageToResponsesInput;
//# sourceMappingURL=responses.cjs.map