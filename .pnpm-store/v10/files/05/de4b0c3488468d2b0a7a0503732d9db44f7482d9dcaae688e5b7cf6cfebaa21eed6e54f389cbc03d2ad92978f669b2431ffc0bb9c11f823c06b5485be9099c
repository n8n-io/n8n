let _langchain_core_outputs = require("@langchain/core/outputs");
let _langchain_core_messages = require("@langchain/core/messages");

//#region src/utils/anthropic.ts
function getAnthropicAPI(config) {
	function partToString(part) {
		return "text" in part ? part.text : "";
	}
	function messageToString(message) {
		return (message?.content ?? []).reduce((acc, part) => {
			return acc + partToString(part);
		}, "");
	}
	function responseToString(response) {
		const data = response.data;
		switch (data?.type) {
			case "message": return messageToString(data);
			default: throw Error(`Unknown type: ${data?.type}`);
		}
	}
	/**
	* Normalize the AIMessageChunk.
	* If the fields are just a string - use that as content.
	* If the content is an array of just text fields, turn them into a string.
	* @param fields
	*/
	function newAIMessageChunk(fields) {
		if (typeof fields === "string") return new _langchain_core_messages.AIMessageChunk(fields);
		const ret = { ...fields };
		if (Array.isArray(fields?.content)) {
			let str = "";
			fields.content.forEach((val) => {
				if (str !== void 0 && val.type === "text") str = `${str}${val.text}`;
				else str = void 0;
			});
			if (str) ret.content = str;
		}
		return new _langchain_core_messages.AIMessageChunk(ret);
	}
	function textContentToMessageFields(textContent) {
		return { content: [textContent] };
	}
	function toolUseContentToMessageFields(toolUseContent) {
		return {
			content: [],
			tool_calls: [{
				id: toolUseContent.id,
				name: toolUseContent.name,
				type: "tool_call",
				args: toolUseContent.input
			}]
		};
	}
	function thinkingContentToMessageFields(thinkingContent) {
		return { content: [thinkingContent] };
	}
	function redactedThinkingContentToMessageFields(thinkingContent) {
		return { content: [thinkingContent] };
	}
	function anthropicContentToMessageFields(anthropicContent) {
		const type = anthropicContent?.type;
		switch (type) {
			case "text": return textContentToMessageFields(anthropicContent);
			case "tool_use": return toolUseContentToMessageFields(anthropicContent);
			case "thinking": return thinkingContentToMessageFields(anthropicContent);
			case "redacted_thinking": return redactedThinkingContentToMessageFields(anthropicContent);
			default:
				console.error(`Unknown message type: ${type}`, anthropicContent);
				return;
		}
	}
	function contentToMessage(anthropicContent) {
		const complexContent = [];
		const toolCalls = [];
		anthropicContent.forEach((ac) => {
			const messageFields = anthropicContentToMessageFields(ac);
			if (messageFields?.content) complexContent.push(...messageFields.content);
			if (messageFields?.tool_calls) toolCalls.push(...messageFields.tool_calls);
		});
		return newAIMessageChunk({
			content: complexContent,
			tool_calls: toolCalls
		});
	}
	function messageToUsageMetadata(message) {
		const usage = message?.usage;
		const inputTokens = usage?.input_tokens ?? 0;
		const outputTokens = usage?.output_tokens ?? 0;
		return {
			input_tokens: inputTokens,
			output_tokens: outputTokens,
			total_tokens: inputTokens + outputTokens,
			input_token_details: {
				cache_read: usage?.cache_read_input_tokens ?? 0,
				cache_creation: usage?.cache_creation_input_tokens ?? 0
			}
		};
	}
	function messageToGenerationInfo(message) {
		return {
			usage_metadata: messageToUsageMetadata(message),
			finish_reason: message.stop_reason
		};
	}
	function messageToChatGeneration(responseMessage) {
		const content = responseMessage?.content ?? [];
		return new _langchain_core_outputs.ChatGenerationChunk({
			text: messageToString(responseMessage),
			message: contentToMessage(content),
			generationInfo: messageToGenerationInfo(responseMessage)
		});
	}
	function messageStartToChatGeneration(event) {
		const responseMessage = event.message;
		return messageToChatGeneration(responseMessage);
	}
	function messageDeltaToChatGeneration(event) {
		const responseMessage = event.delta;
		return messageToChatGeneration(responseMessage);
	}
	function contentBlockStartTextToChatGeneration(event) {
		const content = event.content_block;
		const text = "text" in content ? content.text : "";
		return new _langchain_core_outputs.ChatGenerationChunk({
			message: new _langchain_core_messages.AIMessageChunk({ content: [{
				index: event.index,
				...content
			}] }),
			text
		});
	}
	function contentBlockStartToolUseToChatGeneration(event) {
		const contentBlock = event.content_block;
		const text = "";
		const toolChunk = {
			type: "tool_call_chunk",
			index: event.index,
			name: contentBlock.name,
			id: contentBlock.id
		};
		if (typeof contentBlock.input === "object" && Object.keys(contentBlock.input).length > 0) toolChunk.args = JSON.stringify(contentBlock.input);
		const toolChunks = [toolChunk];
		return new _langchain_core_outputs.ChatGenerationChunk({
			message: newAIMessageChunk({
				content: [{
					index: event.index,
					...contentBlock
				}],
				tool_call_chunks: toolChunks
			}),
			text
		});
	}
	function contentBlockStartToChatGeneration(event) {
		switch (event.content_block.type) {
			case "text": return contentBlockStartTextToChatGeneration(event);
			case "tool_use": return contentBlockStartToolUseToChatGeneration(event);
			default:
				console.warn(`Unexpected start content_block type: ${JSON.stringify(event)}`);
				return null;
		}
	}
	function contentBlockDeltaTextToChatGeneration(event) {
		const text = event.delta?.text;
		return new _langchain_core_outputs.ChatGenerationChunk({
			message: new _langchain_core_messages.AIMessageChunk({ content: [{
				index: event.index,
				type: "text",
				text
			}] }),
			text
		});
	}
	function contentBlockDeltaInputJsonDeltaToChatGeneration(event) {
		const delta = event.delta;
		const text = "";
		const toolChunks = [{
			index: event.index,
			args: delta.partial_json
		}];
		return new _langchain_core_outputs.ChatGenerationChunk({
			message: newAIMessageChunk({
				content: [{
					index: event.index,
					...delta
				}],
				tool_call_chunks: toolChunks
			}),
			text
		});
	}
	function contentBlockDeltaToChatGeneration(event) {
		switch (event.delta.type) {
			case "text_delta": return contentBlockDeltaTextToChatGeneration(event);
			case "input_json_delta": return contentBlockDeltaInputJsonDeltaToChatGeneration(event);
			default:
				console.warn(`Unexpected delta content_block type: ${JSON.stringify(event)}`);
				return null;
		}
	}
	function responseToChatGeneration(response) {
		const data = response.data;
		switch (data.type) {
			case "message": return messageToChatGeneration(data);
			case "message_start": return messageStartToChatGeneration(data);
			case "message_delta": return messageDeltaToChatGeneration(data);
			case "content_block_start": return contentBlockStartToChatGeneration(data);
			case "content_block_delta": return contentBlockDeltaToChatGeneration(data);
			case "ping":
			case "message_stop":
			case "content_block_stop": return null;
			case "error": throw new Error(`Error while streaming results: ${JSON.stringify(data)}`);
			default:
				console.warn("Unknown data for responseToChatGeneration", data);
				return null;
		}
	}
	function chunkToString(chunk) {
		if (chunk === null) return "";
		else if (typeof chunk.content === "string") return chunk.content;
		else if (chunk.content.length === 0) return "";
		else if (chunk.content[0].type === "text") return chunk.content[0].text;
		else throw new Error(`Unexpected chunk: ${chunk}`);
	}
	function responseToBaseMessage(response) {
		return contentToMessage(response.data?.content ?? []);
	}
	function responseToChatResult(response) {
		const message = response.data;
		const generations = [];
		const gen = responseToChatGeneration(response);
		if (gen) generations.push(gen);
		return {
			generations,
			llmOutput: messageToGenerationInfo(message)
		};
	}
	function formatAnthropicVersion() {
		return config?.version ?? "vertex-2023-10-16";
	}
	function textContentToAnthropicContent(content) {
		if (!content.text) return;
		return {
			type: "text",
			text: content.text
		};
	}
	function extractMimeType(str) {
		if (str.startsWith("data:")) return {
			media_type: str.split(":")[1].split(";")[0],
			data: str.split(",")[1]
		};
		return null;
	}
	function imageContentToAnthropicContent(content) {
		const dataUrl = content.image_url;
		const urlInfo = extractMimeType(typeof dataUrl === "string" ? dataUrl : dataUrl?.url);
		if (!urlInfo) return;
		return {
			type: "image",
			source: {
				type: "base64",
				...urlInfo
			}
		};
	}
	function toolUseContentToAnthropicContent(content) {
		return {
			type: "tool_use",
			id: content.id,
			name: content.name,
			input: content.input
		};
	}
	function thinkingContentToAnthropicContent(content) {
		return {
			type: "thinking",
			thinking: content.thinking,
			signature: content.signature
		};
	}
	function redactedThinkingContentToAnthropicContent(content) {
		return {
			type: "redacted_thinking",
			data: content.data
		};
	}
	function contentComplexToAnthropicContent(content) {
		const type = content?.type;
		switch (type) {
			case "text": return textContentToAnthropicContent(content);
			case "image_url": return imageContentToAnthropicContent(content);
			case "tool_use": return toolUseContentToAnthropicContent(content);
			case "thinking": return thinkingContentToAnthropicContent(content);
			case "redacted_thinking": return redactedThinkingContentToAnthropicContent(content);
			default:
				if (type === "tool_call") return;
				console.warn(`Unexpected content type: ${type}`, content);
				return;
		}
	}
	const anthropicContentConverter = {
		providerName: "anthropic",
		fromStandardTextBlock(block) {
			return {
				type: "text",
				text: block.text,
				..."cache_control" in (block.metadata ?? {}) ? { cache_control: block.metadata.cache_control } : {}
			};
		},
		fromStandardImageBlock(block) {
			if (block.source_type === "url") {
				const data = (0, _langchain_core_messages.parseBase64DataUrl)({
					dataUrl: block.url,
					asTypedArray: false
				});
				if (data) return {
					type: "image",
					source: {
						type: "base64",
						data: data.data,
						media_type: data.mime_type
					},
					..."cache_control" in (block.metadata ?? {}) ? { cache_control: block.metadata.cache_control } : {}
				};
				else return {
					type: "image",
					source: {
						type: "url",
						url: block.url,
						media_type: block.mime_type ?? ""
					},
					..."cache_control" in (block.metadata ?? {}) ? { cache_control: block.metadata.cache_control } : {}
				};
			} else if (block.source_type === "base64") return {
				type: "image",
				source: {
					type: "base64",
					data: block.data,
					media_type: block.mime_type ?? ""
				},
				..."cache_control" in (block.metadata ?? {}) ? { cache_control: block.metadata.cache_control } : {}
			};
			else throw new Error(`Unsupported image source type: ${block.source_type}`);
		},
		fromStandardFileBlock(block) {
			const mime_type = (block.mime_type ?? "").split(";")[0];
			if (block.source_type === "url") {
				if (mime_type === "application/pdf" || mime_type === "") return {
					type: "document",
					source: {
						type: "url",
						url: block.url,
						media_type: block.mime_type ?? ""
					},
					..."cache_control" in (block.metadata ?? {}) ? { cache_control: block.metadata.cache_control } : {},
					..."citations" in (block.metadata ?? {}) ? { citations: block.metadata.citations } : {},
					..."context" in (block.metadata ?? {}) ? { context: block.metadata.context } : {},
					...block.metadata?.title || block.metadata?.filename || block.metadata?.name ? { title: block.metadata?.title || block.metadata?.filename || block.metadata?.name } : {}
				};
				throw new Error(`Unsupported file mime type for file url source: ${block.mime_type}`);
			} else if (block.source_type === "text") if (mime_type === "text/plain" || mime_type === "") return {
				type: "document",
				source: {
					type: "text",
					data: block.text,
					media_type: block.mime_type ?? ""
				},
				..."cache_control" in (block.metadata ?? {}) ? { cache_control: block.metadata.cache_control } : {},
				..."citations" in (block.metadata ?? {}) ? { citations: block.metadata.citations } : {},
				..."context" in (block.metadata ?? {}) ? { context: block.metadata.context } : {},
				..."title" in (block.metadata ?? {}) ? { title: block.metadata.title } : {}
			};
			else throw new Error(`Unsupported file mime type for file text source: ${block.mime_type}`);
			else if (block.source_type === "base64") if (mime_type === "application/pdf" || mime_type === "") return {
				type: "document",
				source: {
					type: "base64",
					data: block.data,
					media_type: "application/pdf"
				},
				..."cache_control" in (block.metadata ?? {}) ? { cache_control: block.metadata.cache_control } : {},
				..."citations" in (block.metadata ?? {}) ? { citations: block.metadata.citations } : {},
				..."context" in (block.metadata ?? {}) ? { context: block.metadata.context } : {},
				..."title" in (block.metadata ?? {}) ? { title: block.metadata.title } : {}
			};
			else if ([
				"image/jpeg",
				"image/png",
				"image/gif",
				"image/webp"
			].includes(mime_type)) return {
				type: "document",
				source: {
					type: "content",
					content: [{
						type: "image",
						source: {
							type: "base64",
							data: block.data,
							media_type: mime_type
						}
					}]
				},
				..."cache_control" in (block.metadata ?? {}) ? { cache_control: block.metadata.cache_control } : {},
				..."citations" in (block.metadata ?? {}) ? { citations: block.metadata.citations } : {},
				..."context" in (block.metadata ?? {}) ? { context: block.metadata.context } : {},
				..."title" in (block.metadata ?? {}) ? { title: block.metadata.title } : {}
			};
			else throw new Error(`Unsupported file mime type for file base64 source: ${block.mime_type}`);
			else throw new Error(`Unsupported file source type: ${block.source_type}`);
		}
	};
	function contentToAnthropicContent(content) {
		return (typeof content === "string" ? [{
			type: "text",
			text: content
		}] : content).map((complex) => (0, _langchain_core_messages.isDataContentBlock)(complex) ? (0, _langchain_core_messages.convertToProviderContentBlock)(complex, anthropicContentConverter) : contentComplexToAnthropicContent(complex)).filter(Boolean);
	}
	function toolCallToAnthropicContent(toolCall) {
		return {
			type: "tool_use",
			id: toolCall.id,
			name: toolCall.name,
			input: toolCall.args
		};
	}
	function toolCallsToAnthropicContent(toolCalls) {
		if (toolCalls === void 0) return [];
		return toolCalls.map(toolCallToAnthropicContent);
	}
	function baseRoleToAnthropicMessage(base, role) {
		return {
			role,
			content: contentToAnthropicContent(base.content)
		};
	}
	function aiMessageToAnthropicMessage(base) {
		const ret = baseRoleToAnthropicMessage(base, "assistant");
		const content = ret.content;
		const existingToolUseIds = new Set(content.filter((block) => block.type === "tool_use").map((block) => block.id));
		const toolContent = toolCallsToAnthropicContent(base.tool_calls).filter((block) => !existingToolUseIds.has(block.id));
		if (toolContent.length > 0) ret.content = [...content, ...toolContent];
		return ret;
	}
	function toolMessageToAnthropicMessage(base) {
		return {
			role: "user",
			content: [{
				type: "tool_result",
				tool_use_id: base.tool_call_id,
				content: contentToAnthropicContent(base.content)
			}]
		};
	}
	function baseToAnthropicMessage(base) {
		const type = base._getType();
		switch (type) {
			case "human": return baseRoleToAnthropicMessage(base, "user");
			case "ai": return aiMessageToAnthropicMessage(base);
			case "tool": return toolMessageToAnthropicMessage(base);
			case "system": return;
			default:
				console.warn(`Unknown BaseMessage type: ${type}`, base);
				return;
		}
	}
	function formatMessages(input) {
		const ret = [];
		input.forEach((baseMessage) => {
			const anthropicMessage = baseToAnthropicMessage(baseMessage);
			if (anthropicMessage) ret.push(anthropicMessage);
		});
		return ret;
	}
	function formatSettings(parameters) {
		const ret = {
			stream: parameters?.streaming ?? false,
			max_tokens: parameters?.maxOutputTokens ?? 8192
		};
		if (parameters.topP) ret.top_p = parameters.topP;
		if (parameters.topK) ret.top_k = parameters.topK;
		if (parameters.temperature) ret.temperature = parameters.temperature;
		if (parameters.stopSequences) ret.stop_sequences = parameters.stopSequences;
		return ret;
	}
	function contentComplexArrayToText(contentArray) {
		let ret = "";
		contentArray.forEach((content) => {
			if (content?.type === "text") ret = `${ret}\n${content.text}`;
		});
		return ret;
	}
	function formatSystem(input) {
		let ret = "";
		input.forEach((message) => {
			if (message._getType() === "system") {
				const content = message?.content;
				const contentString = typeof content === "string" ? content : contentComplexArrayToText(content);
				ret = `${ret}\n${contentString}`;
			}
		});
		return ret;
	}
	function formatGeminiTool(tool) {
		if (Object.hasOwn(tool, "functionDeclarations")) return (tool?.functionDeclarations ?? []).map((func) => {
			const inputSchema = func.parameters;
			return {
				name: func.name,
				description: func.description,
				input_schema: inputSchema
			};
		});
		else {
			console.warn(`Unable to format GeminiTool: ${JSON.stringify(tool, null, 1)}`);
			return [];
		}
	}
	function formatTool(tool) {
		if (Object.hasOwn(tool, "name")) return [tool];
		else return formatGeminiTool(tool);
	}
	function formatTools(parameters) {
		const tools = parameters?.tools ?? [];
		const ret = [];
		tools.forEach((tool) => {
			formatTool(tool).forEach((anthropicTool) => {
				if (anthropicTool) ret.push(anthropicTool);
			});
		});
		return ret;
	}
	function formatToolChoice(parameters) {
		const choice = parameters?.tool_choice;
		if (!choice) return;
		else if (typeof choice === "object") return choice;
		else switch (choice) {
			case "any":
			case "auto": return { type: choice };
			case "none": return;
			default: return {
				type: "tool",
				name: choice
			};
		}
	}
	async function formatData(input, parameters) {
		const typedInput = input;
		const anthropicVersion = formatAnthropicVersion();
		const messages = formatMessages(typedInput);
		const settings = formatSettings(parameters);
		const system = formatSystem(typedInput);
		const tools = formatTools(parameters);
		const toolChoice = formatToolChoice(parameters);
		const ret = {
			anthropic_version: anthropicVersion,
			messages,
			...settings
		};
		if (tools && tools.length && parameters?.tool_choice !== "none") ret.tools = tools;
		if (toolChoice) ret.tool_choice = toolChoice;
		if (system?.length) ret.system = system;
		if (config?.thinking) ret.thinking = config?.thinking;
		return ret;
	}
	return {
		responseToString,
		responseToChatGeneration,
		chunkToString,
		responseToBaseMessage,
		responseToChatResult,
		formatData
	};
}
function validateClaudeParams(_params) {}
function isModelClaude(modelName) {
	return modelName.toLowerCase().startsWith("claude");
}

//#endregion
exports.getAnthropicAPI = getAnthropicAPI;
exports.isModelClaude = isModelClaude;
exports.validateClaudeParams = validateClaudeParams;
//# sourceMappingURL=anthropic.cjs.map