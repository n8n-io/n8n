const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_utils_stream = require_rolldown_runtime.__toESM(require("@langchain/core/utils/stream"));

//#region src/utils/bedrock/anthropic.ts
function extractToolCalls(content) {
	const toolCalls = [];
	for (const block of content) if (block.type === "tool_use") toolCalls.push({
		name: block.name,
		args: block.input,
		id: block.id,
		type: "tool_call"
	});
	return toolCalls;
}
function _formatImage(imageUrl) {
	const regex = /^data:(image\/.+);base64,(.+)$/;
	const match = imageUrl.match(regex);
	if (match === null) throw new Error(["Anthropic only supports base64-encoded images currently.", "Example: data:image/png;base64,/9j/4AAQSk..."].join("\n\n"));
	return {
		type: "base64",
		media_type: match[1] ?? "",
		data: match[2] ?? ""
	};
}
function _ensureMessageContents(messages) {
	const updatedMsgs = [];
	for (const message of messages) if (message._getType() === "tool") if (typeof message.content === "string") {
		const previousMessage = updatedMsgs[updatedMsgs.length - 1];
		if (previousMessage?._getType() === "human" && Array.isArray(previousMessage.content) && "type" in previousMessage.content[0] && previousMessage.content[0].type === "tool_result") previousMessage.content.push({
			type: "tool_result",
			content: message.content,
			tool_use_id: message.tool_call_id
		});
		else updatedMsgs.push(new __langchain_core_messages.HumanMessage({ content: [{
			type: "tool_result",
			content: message.content,
			tool_use_id: message.tool_call_id
		}] }));
	} else updatedMsgs.push(new __langchain_core_messages.HumanMessage({ content: [{
		type: "tool_result",
		content: _formatContent(message.content),
		tool_use_id: message.tool_call_id
	}] }));
	else updatedMsgs.push(message);
	return updatedMsgs;
}
function _convertLangChainToolCallToAnthropic(toolCall) {
	if (toolCall.id === void 0) throw new Error(`Anthropic requires all tool calls to have an "id".`);
	return {
		type: "tool_use",
		id: toolCall.id,
		name: toolCall.name,
		input: toolCall.args
	};
}
function _formatContent(content) {
	if (typeof content === "string") return content;
	else {
		const contentBlocks = content.flatMap((contentPart) => {
			if (contentPart.type === "image_url") {
				let source;
				if (typeof contentPart.image_url === "string") source = _formatImage(contentPart.image_url);
				else source = _formatImage(contentPart.image_url.url);
				return {
					type: "image",
					source
				};
			} else if (contentPart.type === "text" || contentPart.type === "text_delta") {
				if (contentPart.text === "") return [];
				return {
					type: "text",
					text: contentPart.text
				};
			} else if (contentPart.type === "tool_use" || contentPart.type === "tool_result") return { ...contentPart };
			else if (contentPart.type === "input_json_delta") return [];
			else throw new Error("Unsupported message content format");
		});
		return contentBlocks;
	}
}
function formatMessagesForAnthropic(messages) {
	const mergedMessages = _ensureMessageContents(messages);
	let system;
	if (mergedMessages.length > 0 && mergedMessages[0]._getType() === "system") {
		if (typeof messages[0].content !== "string") throw new Error("System message content must be a string.");
		system = messages[0].content;
	}
	const conversationMessages = system !== void 0 ? mergedMessages.slice(1) : mergedMessages;
	const formattedMessages = conversationMessages.map((message) => {
		let role;
		if (message._getType() === "human") role = "user";
		else if (message._getType() === "ai") role = "assistant";
		else if (message._getType() === "tool") role = "user";
		else if (message._getType() === "system") throw new Error("System messages are only permitted as the first passed message.");
		else throw new Error(`Message type "${message._getType()}" is not supported.`);
		if ((0, __langchain_core_messages.isAIMessage)(message) && !!message.tool_calls?.length) if (typeof message.content === "string") if (message.content === "") return {
			role,
			content: message.tool_calls.map(_convertLangChainToolCallToAnthropic)
		};
		else return {
			role,
			content: [{
				type: "text",
				text: message.content
			}, ...message.tool_calls.map(_convertLangChainToolCallToAnthropic)]
		};
		else {
			const formattedContent = _formatContent(message.content);
			if (Array.isArray(formattedContent)) {
				const formattedToolsContent = message.tool_calls.map(_convertLangChainToolCallToAnthropic);
				return {
					role,
					content: [...formattedContent, ...formattedToolsContent]
				};
			}
			return {
				role,
				content: formattedContent
			};
		}
		else return {
			role,
			content: _formatContent(message.content)
		};
	});
	return {
		messages: formattedMessages,
		system
	};
}
function isAnthropicTool(tool) {
	if (typeof tool !== "object" || !tool) return false;
	return "input_schema" in tool;
}
function _makeMessageChunkFromAnthropicEvent(data, fields) {
	if (data.type === "message_start") {
		const { content, usage,...additionalKwargs } = data.message;
		const filteredAdditionalKwargs = {};
		for (const [key, value] of Object.entries(additionalKwargs)) if (value !== void 0 && value !== null) filteredAdditionalKwargs[key] = value;
		return new __langchain_core_messages.AIMessageChunk({
			content: fields.coerceContentToString ? "" : [],
			additional_kwargs: filteredAdditionalKwargs
		});
	} else if (data.type === "message_delta") {
		let usageMetadata;
		return new __langchain_core_messages.AIMessageChunk({
			content: fields.coerceContentToString ? "" : [],
			additional_kwargs: { ...data.delta },
			usage_metadata: usageMetadata
		});
	} else if (data.type === "content_block_start" && data.content_block.type === "tool_use") return new __langchain_core_messages.AIMessageChunk({
		content: fields.coerceContentToString ? "" : [{
			index: data.index,
			...data.content_block,
			input: ""
		}],
		additional_kwargs: {}
	});
	else if (data.type === "content_block_delta" && data.delta.type === "text_delta") {
		const content = data.delta?.text;
		if (content !== void 0) return new __langchain_core_messages.AIMessageChunk({
			content: fields.coerceContentToString ? content : [{
				index: data.index,
				...data.delta
			}],
			additional_kwargs: {}
		});
	} else if (data.type === "content_block_delta" && data.delta.type === "input_json_delta") return new __langchain_core_messages.AIMessageChunk({
		content: fields.coerceContentToString ? "" : [{
			index: data.index,
			input: data.delta.partial_json,
			type: data.delta.type
		}],
		additional_kwargs: {}
	});
	else if (data.type === "message_stop" && data["amazon-bedrock-invocationMetrics"] !== void 0) return new __langchain_core_messages.AIMessageChunk({
		content: "",
		response_metadata: { "amazon-bedrock-invocationMetrics": data["amazon-bedrock-invocationMetrics"] },
		usage_metadata: {
			input_tokens: data["amazon-bedrock-invocationMetrics"].inputTokenCount,
			output_tokens: data["amazon-bedrock-invocationMetrics"].outputTokenCount,
			total_tokens: data["amazon-bedrock-invocationMetrics"].inputTokenCount + data["amazon-bedrock-invocationMetrics"].outputTokenCount
		}
	});
	return null;
}
function extractToolCallChunk(chunk) {
	let newToolCallChunk;
	const toolUseChunks = Array.isArray(chunk.content) ? chunk.content.find((c) => c.type === "tool_use") : void 0;
	if (toolUseChunks && "index" in toolUseChunks && "name" in toolUseChunks && "id" in toolUseChunks) newToolCallChunk = {
		args: "",
		id: toolUseChunks.id,
		name: toolUseChunks.name,
		index: toolUseChunks.index,
		type: "tool_call_chunk"
	};
	const inputJsonDeltaChunks = Array.isArray(chunk.content) ? chunk.content.find((c) => c.type === "input_json_delta") : void 0;
	if (inputJsonDeltaChunks && "index" in inputJsonDeltaChunks && "input" in inputJsonDeltaChunks) if (typeof inputJsonDeltaChunks.input === "string") newToolCallChunk = {
		args: inputJsonDeltaChunks.input,
		index: inputJsonDeltaChunks.index,
		type: "tool_call_chunk"
	};
	else newToolCallChunk = {
		args: JSON.stringify(inputJsonDeltaChunks.input, null, 2),
		index: inputJsonDeltaChunks.index,
		type: "tool_call_chunk"
	};
	return newToolCallChunk;
}
function extractToken(chunk) {
	return typeof chunk.content === "string" && chunk.content !== "" ? chunk.content : void 0;
}
function extractToolUseContent(chunk, concatenatedChunks) {
	let newConcatenatedChunks = concatenatedChunks;
	let toolUseContent;
	if (!newConcatenatedChunks) newConcatenatedChunks = chunk;
	else newConcatenatedChunks = (0, __langchain_core_utils_stream.concat)(newConcatenatedChunks, chunk);
	if (Array.isArray(newConcatenatedChunks.content) && newConcatenatedChunks.content.find((c) => c.type === "tool_use")) try {
		const toolUseMsg = newConcatenatedChunks.content.find((c) => c.type === "tool_use");
		if (!toolUseMsg || !("input" in toolUseMsg || "name" in toolUseMsg || "id" in toolUseMsg)) return;
		const parsedArgs = JSON.parse(toolUseMsg.input);
		if (parsedArgs) toolUseContent = {
			type: "tool_use",
			id: toolUseMsg.id,
			name: toolUseMsg.name,
			input: parsedArgs
		};
	} catch (_) {}
	return {
		toolUseContent,
		concatenatedChunks: newConcatenatedChunks
	};
}
function _toolsInParams(params) {
	return !!(params.tools && params.tools.length > 0);
}

//#endregion
exports._makeMessageChunkFromAnthropicEvent = _makeMessageChunkFromAnthropicEvent;
exports._toolsInParams = _toolsInParams;
exports.extractToken = extractToken;
exports.extractToolCallChunk = extractToolCallChunk;
exports.extractToolCalls = extractToolCalls;
exports.extractToolUseContent = extractToolUseContent;
exports.formatMessagesForAnthropic = formatMessagesForAnthropic;
exports.isAnthropicTool = isAnthropicTool;
//# sourceMappingURL=anthropic.cjs.map