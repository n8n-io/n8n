const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_output_parsers = require('../output_parsers.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));

//#region src/utils/message_outputs.ts
function _makeMessageChunkFromAnthropicEvent(data, fields) {
	const response_metadata = { model_provider: "anthropic" };
	if (data.type === "message_start") {
		const { content, usage,...additionalKwargs } = data.message;
		const filteredAdditionalKwargs = {};
		for (const [key, value] of Object.entries(additionalKwargs)) if (value !== void 0 && value !== null) filteredAdditionalKwargs[key] = value;
		const { input_tokens, output_tokens,...rest } = usage ?? {};
		const usageMetadata = {
			input_tokens,
			output_tokens,
			total_tokens: input_tokens + output_tokens,
			input_token_details: {
				cache_creation: rest.cache_creation_input_tokens,
				cache_read: rest.cache_read_input_tokens
			}
		};
		return { chunk: new __langchain_core_messages.AIMessageChunk({
			content: fields.coerceContentToString ? "" : [],
			additional_kwargs: filteredAdditionalKwargs,
			usage_metadata: fields.streamUsage ? usageMetadata : void 0,
			response_metadata: {
				...response_metadata,
				usage: { ...rest }
			},
			id: data.message.id
		}) };
	} else if (data.type === "message_delta") {
		const usageMetadata = {
			input_tokens: 0,
			output_tokens: data.usage.output_tokens,
			total_tokens: data.usage.output_tokens,
			input_token_details: {
				cache_creation: data.usage.cache_creation_input_tokens,
				cache_read: data.usage.cache_read_input_tokens
			}
		};
		const responseMetadata = "context_management" in data.delta ? { context_management: data.delta.context_management } : void 0;
		return { chunk: new __langchain_core_messages.AIMessageChunk({
			content: fields.coerceContentToString ? "" : [],
			response_metadata: responseMetadata,
			additional_kwargs: { ...data.delta },
			usage_metadata: fields.streamUsage ? usageMetadata : void 0
		}) };
	} else if (data.type === "content_block_start" && [
		"tool_use",
		"document",
		"server_tool_use",
		"web_search_tool_result"
	].includes(data.content_block.type)) {
		const contentBlock = data.content_block;
		let toolCallChunks;
		if (contentBlock.type === "tool_use") toolCallChunks = [{
			id: contentBlock.id,
			index: data.index,
			name: contentBlock.name,
			args: ""
		}];
		else toolCallChunks = [];
		return { chunk: new __langchain_core_messages.AIMessageChunk({
			content: fields.coerceContentToString ? "" : [{
				index: data.index,
				...data.content_block,
				input: contentBlock.type === "server_tool_use" || contentBlock.type === "tool_use" ? "" : void 0
			}],
			response_metadata,
			additional_kwargs: {},
			tool_call_chunks: toolCallChunks
		}) };
	} else if (data.type === "content_block_delta" && [
		"text_delta",
		"citations_delta",
		"thinking_delta",
		"signature_delta"
	].includes(data.delta.type)) if (fields.coerceContentToString && "text" in data.delta) return { chunk: new __langchain_core_messages.AIMessageChunk({ content: data.delta.text }) };
	else {
		const contentBlock = data.delta;
		if ("citation" in contentBlock) {
			contentBlock.citations = [contentBlock.citation];
			delete contentBlock.citation;
		}
		if (contentBlock.type === "thinking_delta" || contentBlock.type === "signature_delta") return { chunk: new __langchain_core_messages.AIMessageChunk({
			content: [{
				index: data.index,
				...contentBlock,
				type: "thinking"
			}],
			response_metadata
		}) };
		return { chunk: new __langchain_core_messages.AIMessageChunk({
			content: [{
				index: data.index,
				...contentBlock,
				type: "text"
			}],
			response_metadata
		}) };
	}
	else if (data.type === "content_block_delta" && data.delta.type === "input_json_delta") return { chunk: new __langchain_core_messages.AIMessageChunk({
		content: fields.coerceContentToString ? "" : [{
			index: data.index,
			input: data.delta.partial_json,
			type: data.delta.type
		}],
		response_metadata,
		additional_kwargs: {},
		tool_call_chunks: [{
			index: data.index,
			args: data.delta.partial_json
		}]
	}) };
	else if (data.type === "content_block_start" && data.content_block.type === "text") {
		const content = data.content_block?.text;
		if (content !== void 0) return { chunk: new __langchain_core_messages.AIMessageChunk({
			content: fields.coerceContentToString ? content : [{
				index: data.index,
				...data.content_block
			}],
			response_metadata,
			additional_kwargs: {}
		}) };
	} else if (data.type === "content_block_start" && data.content_block.type === "redacted_thinking") return { chunk: new __langchain_core_messages.AIMessageChunk({
		content: fields.coerceContentToString ? "" : [{
			index: data.index,
			...data.content_block
		}],
		response_metadata
	}) };
	else if (data.type === "content_block_start" && data.content_block.type === "thinking") {
		const content = data.content_block.thinking;
		return { chunk: new __langchain_core_messages.AIMessageChunk({
			content: fields.coerceContentToString ? content : [{
				index: data.index,
				...data.content_block
			}],
			response_metadata
		}) };
	}
	return null;
}
function anthropicResponseToChatMessages(messages, additionalKwargs) {
	const response_metadata = {
		...additionalKwargs,
		model_provider: "anthropic"
	};
	const usage = additionalKwargs.usage;
	const usageMetadata = usage != null ? {
		input_tokens: usage.input_tokens ?? 0,
		output_tokens: usage.output_tokens ?? 0,
		total_tokens: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
		input_token_details: {
			cache_creation: usage.cache_creation_input_tokens,
			cache_read: usage.cache_read_input_tokens
		}
	} : void 0;
	if (messages.length === 1 && messages[0].type === "text") return [{
		text: messages[0].text,
		message: new __langchain_core_messages.AIMessage({
			content: messages[0].text,
			additional_kwargs: additionalKwargs,
			usage_metadata: usageMetadata,
			response_metadata,
			id: additionalKwargs.id
		})
	}];
	else {
		const toolCalls = require_output_parsers.extractToolCalls(messages);
		const generations = [{
			text: "",
			message: new __langchain_core_messages.AIMessage({
				content: messages,
				additional_kwargs: additionalKwargs,
				tool_calls: toolCalls,
				usage_metadata: usageMetadata,
				response_metadata,
				id: additionalKwargs.id
			})
		}];
		return generations;
	}
}

//#endregion
exports._makeMessageChunkFromAnthropicEvent = _makeMessageChunkFromAnthropicEvent;
exports.anthropicResponseToChatMessages = anthropicResponseToChatMessages;
//# sourceMappingURL=message_outputs.cjs.map