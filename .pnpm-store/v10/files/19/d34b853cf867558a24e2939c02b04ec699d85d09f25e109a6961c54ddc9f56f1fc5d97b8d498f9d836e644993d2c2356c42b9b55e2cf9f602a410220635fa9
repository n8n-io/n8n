const require_utils = require("./utils.cjs");
//#region src/messages/block_translators/anthropic.ts
function convertAnthropicAnnotation(citation) {
	if (citation.type === "char_location" && require_utils._isString(citation.document_title) && require_utils._isNumber(citation.start_char_index) && require_utils._isNumber(citation.end_char_index) && require_utils._isString(citation.cited_text)) {
		const { document_title, start_char_index, end_char_index, cited_text, ...rest } = citation;
		return {
			...rest,
			type: "citation",
			source: "char",
			title: document_title ?? void 0,
			startIndex: start_char_index,
			endIndex: end_char_index,
			citedText: cited_text
		};
	}
	if (citation.type === "page_location" && require_utils._isString(citation.document_title) && require_utils._isNumber(citation.start_page_number) && require_utils._isNumber(citation.end_page_number) && require_utils._isString(citation.cited_text)) {
		const { document_title, start_page_number, end_page_number, cited_text, ...rest } = citation;
		return {
			...rest,
			type: "citation",
			source: "page",
			title: document_title ?? void 0,
			startIndex: start_page_number,
			endIndex: end_page_number,
			citedText: cited_text
		};
	}
	if (citation.type === "content_block_location" && require_utils._isString(citation.document_title) && require_utils._isNumber(citation.start_block_index) && require_utils._isNumber(citation.end_block_index) && require_utils._isString(citation.cited_text)) {
		const { document_title, start_block_index, end_block_index, cited_text, ...rest } = citation;
		return {
			...rest,
			type: "citation",
			source: "block",
			title: document_title ?? void 0,
			startIndex: start_block_index,
			endIndex: end_block_index,
			citedText: cited_text
		};
	}
	if (citation.type === "web_search_result_location" && require_utils._isString(citation.url) && require_utils._isString(citation.title) && require_utils._isString(citation.encrypted_index) && require_utils._isString(citation.cited_text)) {
		const { url, title, encrypted_index, cited_text, ...rest } = citation;
		return {
			...rest,
			type: "citation",
			source: "url",
			url,
			title,
			startIndex: Number(encrypted_index),
			endIndex: Number(encrypted_index),
			citedText: cited_text
		};
	}
	if (citation.type === "search_result_location" && require_utils._isString(citation.source) && require_utils._isString(citation.title) && require_utils._isNumber(citation.start_block_index) && require_utils._isNumber(citation.end_block_index) && require_utils._isString(citation.cited_text)) {
		const { source, title, start_block_index, end_block_index, cited_text, ...rest } = citation;
		return {
			...rest,
			type: "citation",
			source: "search",
			url: source,
			title: title ?? void 0,
			startIndex: start_block_index,
			endIndex: end_block_index,
			citedText: cited_text
		};
	}
}
/**
* Converts an Anthropic content block to a standard V1 content block.
*
* This function handles the conversion of Anthropic-specific content blocks
* (document and image blocks) to the standardized V1 format. It supports
* various source types including base64 data, URLs, file IDs, and text data.
*
* @param block - The Anthropic content block to convert
* @returns A standard V1 content block if conversion is successful, undefined otherwise
*
* @example
* ```typescript
* const anthropicBlock = {
*   type: "image",
*   source: {
*     type: "base64",
*     media_type: "image/png",
*     data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
*   }
* };
*
* const standardBlock = convertToV1FromAnthropicContentBlock(anthropicBlock);
* // Returns: { type: "image", mimeType: "image/png", data: "..." }
* ```
*/
function convertToV1FromAnthropicContentBlock(block) {
	if (require_utils._isContentBlock(block, "document") && require_utils._isObject(block.source) && "type" in block.source) {
		if (block.source.type === "base64" && require_utils._isString(block.source.media_type) && require_utils._isString(block.source.data)) return {
			type: "file",
			mimeType: block.source.media_type,
			data: block.source.data
		};
		else if (block.source.type === "url" && require_utils._isString(block.source.url)) return {
			type: "file",
			url: block.source.url
		};
		else if (block.source.type === "file" && require_utils._isString(block.source.file_id)) return {
			type: "file",
			fileId: block.source.file_id
		};
		else if (block.source.type === "text" && require_utils._isString(block.source.data)) return {
			type: "file",
			mimeType: String(block.source.media_type ?? "text/plain"),
			data: block.source.data
		};
	} else if (require_utils._isContentBlock(block, "image") && require_utils._isObject(block.source) && "type" in block.source) {
		if (block.source.type === "base64" && require_utils._isString(block.source.media_type) && require_utils._isString(block.source.data)) return {
			type: "image",
			mimeType: block.source.media_type,
			data: block.source.data
		};
		else if (block.source.type === "url" && require_utils._isString(block.source.url)) return {
			type: "image",
			url: block.source.url
		};
		else if (block.source.type === "file" && require_utils._isString(block.source.file_id)) return {
			type: "image",
			fileId: block.source.file_id
		};
	}
}
/**
* Converts an array of content blocks from Anthropic format to v1 standard format.
*
* This function processes each content block in the input array, attempting to convert
* Anthropic-specific block formats (like image blocks with source objects, document blocks, etc.)
* to the standardized v1 content block format. If a block cannot be converted, it is
* passed through as-is with a type assertion to ContentBlock.Standard.
*
* @param content - Array of content blocks in Anthropic format to be converted
* @returns Array of content blocks in v1 standard format
*/
function convertToV1FromAnthropicInput(content) {
	function* iterateContent() {
		for (const block of content) {
			const stdBlock = convertToV1FromAnthropicContentBlock(block);
			if (stdBlock) yield stdBlock;
			else yield block;
		}
	}
	return Array.from(iterateContent());
}
/**
* Converts an Anthropic AI message to an array of v1 standard content blocks.
*
* This function processes an AI message containing Anthropic-specific content blocks
* and converts them to the standardized v1 content block format.
*
* @param message - The AI message containing Anthropic-formatted content blocks
* @returns Array of content blocks in v1 standard format
*
* @example
* ```typescript
* const message = new AIMessage([
*   { type: "text", text: "Hello world" },
*   { type: "thinking", text: "Let me think about this..." },
*   { type: "tool_use", id: "123", name: "calculator", input: { a: 1, b: 2 } }
* ]);
*
* const standardBlocks = convertToV1FromAnthropicMessage(message);
* // Returns:
* // [
* //   { type: "text", text: "Hello world" },
* //   { type: "reasoning", reasoning: "Let me think about this..." },
* //   { type: "tool_call", id: "123", name: "calculator", args: { a: 1, b: 2 } }
* // ]
* ```
*/
function convertToV1FromAnthropicMessage(message) {
	function* iterateContent() {
		const content = typeof message.content === "string" ? [{
			type: "text",
			text: message.content
		}] : message.content;
		for (const block of content) {
			if (require_utils._isContentBlock(block, "text") && require_utils._isString(block.text)) {
				const { text, citations, ...rest } = block;
				if (require_utils._isArray(citations) && citations.length) {
					const _citations = citations.reduce((acc, item) => {
						const citation = convertAnthropicAnnotation(item);
						if (citation) return [...acc, citation];
						return acc;
					}, []);
					yield {
						...rest,
						type: "text",
						text,
						annotations: _citations
					};
					continue;
				} else {
					yield {
						...rest,
						type: "text",
						text
					};
					continue;
				}
			} else if (require_utils._isContentBlock(block, "thinking") && require_utils._isString(block.thinking)) {
				const { thinking, signature, ...rest } = block;
				yield {
					...rest,
					type: "reasoning",
					reasoning: thinking,
					signature
				};
				continue;
			} else if (require_utils._isContentBlock(block, "redacted_thinking")) {
				yield {
					type: "non_standard",
					value: block
				};
				continue;
			} else if (require_utils._isContentBlock(block, "tool_use") && require_utils._isString(block.name) && require_utils._isString(block.id)) {
				yield {
					type: "tool_call",
					id: block.id,
					name: block.name,
					args: block.input
				};
				continue;
			} else if (require_utils._isContentBlock(block, "input_json_delta")) {
				if (_isAIMessageChunk(message) && message.tool_call_chunks?.length) {
					const tool_call_chunk = message.tool_call_chunks[0];
					yield {
						type: "tool_call_chunk",
						id: tool_call_chunk.id,
						name: tool_call_chunk.name,
						args: tool_call_chunk.args,
						index: tool_call_chunk.index
					};
					continue;
				}
			} else if (require_utils._isContentBlock(block, "server_tool_use") && require_utils._isString(block.name) && require_utils._isString(block.id)) {
				const { name, id } = block;
				if (name === "web_search") {
					yield {
						id,
						type: "server_tool_call",
						name: "web_search",
						args: { query: require_utils.iife(() => {
							if (typeof block.input === "string") return block.input;
							else if (require_utils._isObject(block.input) && require_utils._isString(block.input.query)) return block.input.query;
							else if (require_utils._isString(block.partial_json)) {
								const json = require_utils.safeParseJson(block.partial_json);
								if (json?.query) return json.query;
							}
							return "";
						}) }
					};
					continue;
				} else if (block.name === "code_execution") {
					yield {
						id,
						type: "server_tool_call",
						name: "code_execution",
						args: { code: require_utils.iife(() => {
							if (typeof block.input === "string") return block.input;
							else if (require_utils._isObject(block.input) && require_utils._isString(block.input.code)) return block.input.code;
							else if (require_utils._isString(block.partial_json)) {
								const json = require_utils.safeParseJson(block.partial_json);
								if (json?.code) return json.code;
							}
							return "";
						}) }
					};
					continue;
				}
			} else if (require_utils._isContentBlock(block, "web_search_tool_result") && require_utils._isString(block.tool_use_id) && require_utils._isArray(block.content)) {
				const { content, tool_use_id } = block;
				yield {
					type: "server_tool_call_result",
					name: "web_search",
					toolCallId: tool_use_id,
					status: "success",
					output: { urls: content.reduce((acc, content) => {
						if (require_utils._isContentBlock(content, "web_search_result")) return [...acc, content.url];
						return acc;
					}, []) }
				};
				continue;
			} else if (require_utils._isContentBlock(block, "code_execution_tool_result") && require_utils._isString(block.tool_use_id) && require_utils._isObject(block.content)) {
				yield {
					type: "server_tool_call_result",
					name: "code_execution",
					toolCallId: block.tool_use_id,
					status: "success",
					output: block.content
				};
				continue;
			} else if (require_utils._isContentBlock(block, "mcp_tool_use")) {
				yield {
					id: block.id,
					type: "server_tool_call",
					name: "mcp_tool_use",
					args: block.input
				};
				continue;
			} else if (require_utils._isContentBlock(block, "mcp_tool_result") && require_utils._isString(block.tool_use_id) && require_utils._isObject(block.content)) {
				yield {
					type: "server_tool_call_result",
					name: "mcp_tool_use",
					toolCallId: block.tool_use_id,
					status: "success",
					output: block.content
				};
				continue;
			} else if (require_utils._isContentBlock(block, "container_upload")) {
				yield {
					type: "server_tool_call",
					name: "container_upload",
					args: block.input
				};
				continue;
			} else if (require_utils._isContentBlock(block, "search_result")) {
				yield {
					id: block.id,
					type: "non_standard",
					value: block
				};
				continue;
			} else if (require_utils._isContentBlock(block, "tool_result")) {
				yield {
					id: block.id,
					type: "non_standard",
					value: block
				};
				continue;
			} else {
				const stdBlock = convertToV1FromAnthropicContentBlock(block);
				if (stdBlock) {
					yield stdBlock;
					continue;
				}
			}
			yield {
				type: "non_standard",
				value: block
			};
		}
	}
	return Array.from(iterateContent());
}
const ChatAnthropicTranslator = {
	translateContent: convertToV1FromAnthropicMessage,
	translateContentChunk: convertToV1FromAnthropicMessage
};
function _isAIMessageChunk(message) {
	return typeof message?._getType === "function" && typeof message.concat === "function" && message._getType() === "ai";
}
//#endregion
exports.ChatAnthropicTranslator = ChatAnthropicTranslator;
exports.convertToV1FromAnthropicInput = convertToV1FromAnthropicInput;

//# sourceMappingURL=anthropic.cjs.map