const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_compat = require('./compat.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));

//#region src/utils/message_inputs.ts
function isDefaultCachePoint(block) {
	return Boolean(typeof block === "object" && block !== null && "cachePoint" in block && block.cachePoint && typeof block.cachePoint === "object" && block.cachePoint !== null && "type" in block.cachePoint && block.cachePoint.type === "default");
}
function extractImageInfo(base64) {
	const formatMatch = base64.match(/^data:image\/(\w+);base64,/);
	let format;
	if (formatMatch) {
		const extractedFormat = formatMatch[1].toLowerCase();
		if ([
			"gif",
			"jpeg",
			"png",
			"webp"
		].includes(extractedFormat)) format = extractedFormat;
	}
	const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
	const binaryString = atob(base64Data);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i += 1) bytes[i] = binaryString.charCodeAt(i);
	return { image: {
		format,
		source: { bytes }
	} };
}
const standardContentBlockConverter = {
	providerName: "ChatBedrockConverse",
	fromStandardTextBlock(block) {
		return { text: block.text };
	},
	fromStandardImageBlock(block) {
		let format;
		if (block.source_type === "url") {
			const parsedData = (0, __langchain_core_messages.parseBase64DataUrl)({
				dataUrl: block.url,
				asTypedArray: true
			});
			if (parsedData) {
				const parsedMimeType = (0, __langchain_core_messages.parseMimeType)(parsedData.mime_type);
				format = parsedMimeType.type;
				return { image: {
					format,
					source: { bytes: parsedData.data }
				} };
			} else throw new Error("Only base64 data URLs are supported for image blocks with source type 'url' with ChatBedrockConverse.");
		} else if (block.source_type === "base64") {
			if (block.mime_type) {
				const parsedMimeType = (0, __langchain_core_messages.parseMimeType)(block.mime_type);
				format = parsedMimeType.subtype;
			}
			if (format && ![
				"gif",
				"jpeg",
				"png",
				"webp"
			].includes(format)) throw new Error(`Unsupported image mime type: "${block.mime_type}" ChatBedrockConverse only supports "image/gif", "image/jpeg", "image/png", and "image/webp" formats.`);
			return { image: {
				format,
				source: { bytes: Uint8Array.from(atob(block.data), (c) => c.charCodeAt(0)) }
			} };
		} else if (block.source_type === "id") throw new Error("Image source type 'id' not supported with ChatBedrockConverse.");
		else throw new Error(`Unsupported image source type: "${block.source_type}" with ChatBedrockConverse.`);
	},
	fromStandardFileBlock(block) {
		const mimeTypeToDocumentFormat = {
			"text/csv": "csv",
			"application/msword": "doc",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
			"text/html": "html",
			"text/markdown": "md",
			"application/pdf": "pdf",
			"text/plain": "txt",
			"application/vnd.ms-excel": "xls",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx"
		};
		const name = block.metadata?.name ?? block.metadata?.filename ?? block.metadata?.title;
		if (block.source_type === "text") return { document: {
			name,
			format: "txt",
			source: { bytes: new TextEncoder().encode(block.text) }
		} };
		if (block.source_type === "url") {
			const parsedData = (0, __langchain_core_messages.parseBase64DataUrl)({
				dataUrl: block.url,
				asTypedArray: true
			});
			if (parsedData) {
				const parsedMimeType = (0, __langchain_core_messages.parseMimeType)(parsedData.mime_type ?? block.mime_type);
				const mimeType = `${parsedMimeType.type}/${parsedMimeType.subtype}`;
				const format = mimeTypeToDocumentFormat[mimeType];
				return { document: {
					name,
					format,
					source: { bytes: parsedData.data }
				} };
			}
			throw new Error("Only base64 data URLs are supported for file blocks with source type 'url' with ChatBedrockConverse.");
		}
		if (block.source_type === "base64") {
			let format;
			if (block.mime_type) {
				const parsedMimeType = (0, __langchain_core_messages.parseMimeType)(block.mime_type);
				const mimeType = `${parsedMimeType.type}/${parsedMimeType.subtype}`;
				format = mimeTypeToDocumentFormat[mimeType];
				if (format === void 0) throw new Error(`Unsupported file mime type: "${block.mime_type}" ChatBedrockConverse only supports ${Object.keys(mimeTypeToDocumentFormat).join(", ")} formats.`);
			}
			return { document: {
				name,
				format,
				source: { bytes: Uint8Array.from(atob(block.data), (c) => c.charCodeAt(0)) }
			} };
		}
		if (block.source_type === "id") throw new Error("File source type 'id' not supported with ChatBedrockConverse.");
		throw new Error(`Unsupported file source type: "${block.source_type}" with ChatBedrockConverse.`);
	}
};
function convertLangChainContentBlockToConverseContentBlock({ block, onUnknown = "throw" }) {
	if (typeof block === "string") return { text: block };
	if ((0, __langchain_core_messages.isDataContentBlock)(block)) return (0, __langchain_core_messages.convertToProviderContentBlock)(block, standardContentBlockConverter);
	if (block.type === "text") return { text: block.text };
	if (block.type === "image_url") return extractImageInfo(typeof block.image_url === "string" ? block.image_url : block.image_url.url);
	if (block.type === "document" && block.document !== void 0) return { document: block.document };
	if (block.type === "image" && block.image !== void 0) return { image: block.image };
	if (isDefaultCachePoint(block)) return { cachePoint: { type: "default" } };
	if (onUnknown === "throw") throw new Error(`Unsupported content block type: ${block.type}`);
	else return block;
}
function convertSystemMessageToConverseMessage(msg) {
	if (typeof msg.content === "string") return [{ text: msg.content }];
	else if (Array.isArray(msg.content) && msg.content.length > 0) {
		const contentBlocks = [];
		for (const block of msg.content) if (block.type === "text" && typeof block.text === "string") contentBlocks.push({ text: block.text });
		else if (isDefaultCachePoint(block)) contentBlocks.push({ cachePoint: { type: "default" } });
		else break;
		if (msg.content.length === contentBlocks.length) return contentBlocks;
	}
	throw new Error("System message content must be either a string, or an array of text blocks, optionally including a cache point.");
}
function convertAIMessageToConverseMessage(msg) {
	if (msg.response_metadata.response_format === "v1") return {
		role: "assistant",
		content: require_compat.convertFromV1ToChatBedrockConverseMessage(msg)
	};
	const assistantMsg = {
		role: "assistant",
		content: []
	};
	if (typeof msg.content === "string" && msg.content !== "") assistantMsg.content?.push({ text: msg.content });
	else if (Array.isArray(msg.content)) {
		const concatenatedBlocks = concatenateLangchainReasoningBlocks(msg.content);
		const contentBlocks = [];
		concatenatedBlocks.forEach((block) => {
			if (block.type === "text" && block.text !== "") {
				const cleanedText = block.text?.replace(/\n/g, "").trim();
				if (cleanedText === "") {
					if (contentBlocks.length > 0) {
						const mergedTextContent = `${contentBlocks[contentBlocks.length - 1].text}${block.text}`;
						contentBlocks[contentBlocks.length - 1].text = mergedTextContent;
					}
				} else contentBlocks.push({ text: block.text });
			} else if (block.type === "reasoning_content") contentBlocks.push({ reasoningContent: langchainReasoningBlockToBedrockReasoningBlock(block) });
			else if (isDefaultCachePoint(block)) contentBlocks.push({ cachePoint: { type: "default" } });
			else {
				const blockValues = Object.fromEntries(Object.entries(block).filter(([key]) => key !== "type"));
				throw new Error(`Unsupported content block type: ${block.type} with content of ${JSON.stringify(blockValues, null, 2)}`);
			}
		});
		assistantMsg.content = [...assistantMsg.content ? assistantMsg.content : [], ...contentBlocks];
	}
	if (msg.tool_calls && msg.tool_calls.length) assistantMsg.content = [...assistantMsg.content ? assistantMsg.content : [], ...msg.tool_calls.map((tc) => ({ toolUse: {
		toolUseId: tc.id,
		name: tc.name,
		input: tc.args
	} }))];
	return assistantMsg;
}
function convertHumanMessageToConverseMessage(msg) {
	if (msg.content === "") throw new Error(`Invalid message content: empty string. '${msg.type}' must contain non-empty content.`);
	const contentParts = Array.isArray(msg.content) ? msg.content : [msg.content];
	const content = contentParts.map((c) => convertLangChainContentBlockToConverseContentBlock({
		block: c,
		onUnknown: "throw"
	}));
	return {
		role: "user",
		content
	};
}
function convertToolMessageToConverseMessage(msg) {
	const castMsg = msg;
	if (typeof castMsg.content === "string") return {
		role: "user",
		content: [{ toolResult: {
			toolUseId: castMsg.tool_call_id,
			content: [{ text: castMsg.content }]
		} }]
	};
	else return {
		role: "user",
		content: [{ toolResult: {
			toolUseId: castMsg.tool_call_id,
			content: msg.content.map((c) => {
				const converted = convertLangChainContentBlockToConverseContentBlock({
					block: c,
					onUnknown: "returnUnmodified"
				});
				if (converted !== c) return converted;
				return { json: c };
			})
		} }]
	};
}
function convertToConverseMessages(messages) {
	const converseSystem = messages.reduce((acc, msg) => {
		if (__langchain_core_messages.SystemMessage.isInstance(msg)) acc.push(...convertSystemMessageToConverseMessage(msg));
		return acc;
	}, []);
	const converseMessages = messages.filter((msg) => !__langchain_core_messages.SystemMessage.isInstance(msg)).map((msg) => {
		if (__langchain_core_messages.AIMessage.isInstance(msg)) return convertAIMessageToConverseMessage(msg);
		else if (__langchain_core_messages.HumanMessage.isInstance(msg) || __langchain_core_messages.ChatMessage.isInstance(msg)) return convertHumanMessageToConverseMessage(msg);
		else if (__langchain_core_messages.ToolMessage.isInstance(msg)) return convertToolMessageToConverseMessage(msg);
		else throw new Error(`Unsupported message type: ${msg.type}`);
	});
	const combinedConverseMessages = converseMessages.reduce((acc, curr) => {
		const lastMessage = acc[acc.length - 1];
		if (lastMessage && lastMessage.role === "user" && lastMessage.content?.some((c) => "toolResult" in c) && curr.role === "user" && curr.content?.some((c) => "toolResult" in c)) lastMessage.content = lastMessage.content.concat(curr.content);
		else acc.push(curr);
		return acc;
	}, []);
	return {
		converseMessages: combinedConverseMessages,
		converseSystem
	};
}
function langchainReasoningBlockToBedrockReasoningBlock(content) {
	if (content.type !== "reasoning_content") throw new Error("Invalid reasoning content");
	if ("reasoningText" in content) return { reasoningText: content.reasoningText };
	if ("redactedContent" in content) return { redactedContent: Buffer.from(content.redactedContent, "base64") };
	throw new Error("Invalid reasoning content");
}
function concatenateLangchainReasoningBlocks(content) {
	const concatenatedBlocks = [];
	let concatenatedBlock = {};
	for (const block of content) {
		if (block.type !== "reasoning_content") {
			if (Object.keys(concatenatedBlock).length > 0) {
				concatenatedBlocks.push(concatenatedBlock);
				concatenatedBlock = {};
			}
			concatenatedBlocks.push(block);
			continue;
		}
		if ("reasoningText" in block && typeof block.reasoningText === "object") {
			if ("redactedContent" in concatenatedBlock) {
				concatenatedBlocks.push(concatenatedBlock);
				concatenatedBlock = {};
			}
			const { text, signature } = block.reasoningText;
			const { text: prevText, signature: prevSignature } = "reasoningText" in concatenatedBlock ? concatenatedBlock.reasoningText : {};
			concatenatedBlock = {
				type: "reasoning_content",
				reasoningText: {
					...concatenatedBlock.reasoningText ?? {},
					...prevText !== void 0 || text !== void 0 ? { text: (prevText ?? "") + (text ?? "") } : {},
					...prevSignature !== void 0 || signature !== void 0 ? { signature: (prevSignature ?? "") + (signature ?? "") } : {}
				}
			};
			if ("signature" in block.reasoningText) {
				concatenatedBlocks.push(concatenatedBlock);
				concatenatedBlock = {};
			}
		}
		if ("redactedContent" in block) {
			if ("reasoningText" in concatenatedBlock) {
				concatenatedBlocks.push(concatenatedBlock);
				concatenatedBlock = {};
			}
			const { redactedContent } = block;
			const prevRedactedContent = "redactedContent" in concatenatedBlock ? concatenatedBlock.redactedContent : "";
			concatenatedBlock = {
				type: "reasoning_content",
				redactedContent: prevRedactedContent + redactedContent
			};
		}
	}
	if (Object.keys(concatenatedBlock).length > 0) concatenatedBlocks.push(concatenatedBlock);
	return concatenatedBlocks;
}

//#endregion
exports.convertToConverseMessages = convertToConverseMessages;
//# sourceMappingURL=message_inputs.cjs.map