const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_content = require('./content.cjs');
const require_standard = require('./standard.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));

//#region src/utils/message_inputs.ts
function _formatImage(imageUrl) {
	const parsed = (0, __langchain_core_messages.parseBase64DataUrl)({ dataUrl: imageUrl });
	if (parsed) return {
		type: "base64",
		media_type: parsed.mime_type,
		data: parsed.data
	};
	let parsedUrl;
	try {
		parsedUrl = new URL(imageUrl);
	} catch {
		throw new Error([
			`Malformed image URL: ${JSON.stringify(imageUrl)}. Content blocks of type 'image_url' must be a valid http, https, or base64-encoded data URL.`,
			"Example: data:image/png;base64,/9j/4AAQSk...",
			"Example: https://example.com/image.jpg"
		].join("\n\n"));
	}
	if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") return {
		type: "url",
		url: imageUrl
	};
	throw new Error([
		`Invalid image URL protocol: ${JSON.stringify(parsedUrl.protocol)}. Anthropic only supports images as http, https, or base64-encoded data URLs on 'image_url' content blocks.`,
		"Example: data:image/png;base64,/9j/4AAQSk...",
		"Example: https://example.com/image.jpg"
	].join("\n\n"));
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
		...message.content != null ? { content: _formatContent(message) } : {},
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
function* _formatContentBlocks(content) {
	const toolTypes = [
		"bash_code_execution_tool_result",
		"input_json_delta",
		"server_tool_use",
		"text_editor_code_execution_tool_result",
		"tool_result",
		"tool_use",
		"web_search_result",
		"web_search_tool_result"
	];
	const textTypes = ["text", "text_delta"];
	for (const contentPart of content) {
		if ((0, __langchain_core_messages.isDataContentBlock)(contentPart)) yield (0, __langchain_core_messages.convertToProviderContentBlock)(contentPart, require_content.standardContentBlockConverter);
		const cacheControl = "cache_control" in contentPart ? contentPart.cache_control : void 0;
		if (contentPart.type === "image_url") {
			let source;
			if (typeof contentPart.image_url === "string") source = _formatImage(contentPart.image_url);
			else if (typeof contentPart.image_url === "object" && contentPart.image_url !== null && "url" in contentPart.image_url && typeof contentPart.image_url.url === "string") source = _formatImage(contentPart.image_url.url);
			if (source) yield {
				type: "image",
				source,
				...cacheControl ? { cache_control: cacheControl } : {}
			};
		} else if (require_content._isAnthropicImageBlockParam(contentPart)) return contentPart;
		else if (contentPart.type === "document") yield {
			...contentPart,
			...cacheControl ? { cache_control: cacheControl } : {}
		};
		else if (require_content._isAnthropicThinkingBlock(contentPart)) {
			const block = {
				type: "thinking",
				thinking: contentPart.thinking,
				signature: contentPart.signature,
				...cacheControl ? { cache_control: cacheControl } : {}
			};
			yield block;
		} else if (require_content._isAnthropicRedactedThinkingBlock(contentPart)) {
			const block = {
				type: "redacted_thinking",
				data: contentPart.data,
				...cacheControl ? { cache_control: cacheControl } : {}
			};
			yield block;
		} else if (require_content._isAnthropicSearchResultBlock(contentPart)) {
			const block = {
				type: "search_result",
				title: contentPart.title,
				source: contentPart.source,
				..."cache_control" in contentPart && contentPart.cache_control ? { cache_control: contentPart.cache_control } : {},
				..."citations" in contentPart && contentPart.citations ? { citations: contentPart.citations } : {},
				content: contentPart.content
			};
			yield block;
		} else if (textTypes.find((t) => t === contentPart.type) && "text" in contentPart) yield {
			type: "text",
			text: contentPart.text,
			...cacheControl ? { cache_control: cacheControl } : {},
			..."citations" in contentPart && contentPart.citations ? { citations: contentPart.citations } : {}
		};
		else if (toolTypes.find((t) => t === contentPart.type)) {
			const contentPartCopy = { ...contentPart };
			if ("index" in contentPartCopy) delete contentPartCopy.index;
			if (contentPartCopy.type === "input_json_delta") contentPartCopy.type = "tool_use";
			if ("input" in contentPartCopy) {
				if (typeof contentPartCopy.input === "string") try {
					contentPartCopy.input = JSON.parse(contentPartCopy.input);
				} catch {
					contentPartCopy.input = {};
				}
			}
			yield {
				...contentPartCopy,
				...cacheControl ? { cache_control: cacheControl } : {}
			};
		} else if (contentPart.type === "container_upload") yield {
			...contentPart,
			...cacheControl ? { cache_control: cacheControl } : {}
		};
	}
}
function _formatContent(message) {
	const { content } = message;
	if (typeof content === "string") return content;
	else return Array.from(_formatContentBlocks(content));
}
/**
* Formats messages as a prompt for the model.
* Used in LangSmith, export is important here.
* @param messages The base messages to format as a prompt.
* @returns The formatted prompt.
*/
function _convertMessagesToAnthropicPayload(messages) {
	const mergedMessages = _ensureMessageContents(messages);
	let system;
	if (mergedMessages.length > 0 && mergedMessages[0]._getType() === "system") system = messages[0].content;
	const conversationMessages = system !== void 0 ? mergedMessages.slice(1) : mergedMessages;
	const formattedMessages = conversationMessages.map((message) => {
		let role;
		if (message._getType() === "human") role = "user";
		else if (message._getType() === "ai") role = "assistant";
		else if (message._getType() === "tool") role = "user";
		else if (message._getType() === "system") throw new Error("System messages are only permitted as the first passed message.");
		else throw new Error(`Message type "${message.type}" is not supported.`);
		if ((0, __langchain_core_messages.isAIMessage)(message) && message.response_metadata?.output_version === "v1") return {
			role,
			content: require_standard._formatStandardContent(message)
		};
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
			const { content } = message;
			const hasMismatchedToolCalls = !message.tool_calls.every((toolCall) => content.find((contentPart) => (contentPart.type === "tool_use" || contentPart.type === "input_json_delta" || contentPart.type === "server_tool_use") && contentPart.id === toolCall.id));
			if (hasMismatchedToolCalls) console.warn(`The "tool_calls" field on a message is only respected if content is a string.`);
			return {
				role,
				content: _formatContent(message)
			};
		}
		else return {
			role,
			content: _formatContent(message)
		};
	});
	return {
		messages: mergeMessages(formattedMessages),
		system
	};
}
function mergeMessages(messages) {
	if (!messages || messages.length <= 1) return messages;
	const result = [];
	let currentMessage = messages[0];
	const normalizeContent = (content) => {
		if (typeof content === "string") return [{
			type: "text",
			text: content
		}];
		return content;
	};
	const isToolResultMessage = (msg) => {
		if (msg.role !== "user") return false;
		if (typeof msg.content === "string") return false;
		return Array.isArray(msg.content) && msg.content.every((item) => item.type === "tool_result");
	};
	for (let i = 1; i < messages.length; i += 1) {
		const nextMessage = messages[i];
		if (isToolResultMessage(currentMessage) && isToolResultMessage(nextMessage)) currentMessage = {
			...currentMessage,
			content: [...normalizeContent(currentMessage.content), ...normalizeContent(nextMessage.content)]
		};
		else {
			result.push(currentMessage);
			currentMessage = nextMessage;
		}
	}
	result.push(currentMessage);
	return result;
}

//#endregion
exports._convertMessagesToAnthropicPayload = _convertMessagesToAnthropicPayload;
//# sourceMappingURL=message_inputs.cjs.map