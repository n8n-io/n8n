const require_utils = require("./utils.cjs");
//#region src/messages/block_translators/google_genai.ts
function convertToV1FromChatGoogleMessage(message) {
	function* iterateContent() {
		const content = typeof message.content === "string" ? [{
			type: "text",
			text: message.content
		}] : message.content;
		for (const block of content) {
			if (require_utils._isContentBlock(block, "text") && require_utils._isString(block.text)) {
				yield {
					type: "text",
					text: block.text
				};
				continue;
			} else if (require_utils._isContentBlock(block, "thinking") && require_utils._isString(block.thinking)) {
				yield {
					type: "reasoning",
					reasoning: block.thinking,
					...block.signature ? { signature: block.signature } : {}
				};
				continue;
			} else if (require_utils._isContentBlock(block, "inlineData") && require_utils._isObject(block.inlineData) && require_utils._isString(block.inlineData.mimeType) && require_utils._isString(block.inlineData.data)) {
				yield {
					type: "file",
					mimeType: block.inlineData.mimeType,
					data: block.inlineData.data
				};
				continue;
			} else if (require_utils._isContentBlock(block, "functionCall") && require_utils._isObject(block.functionCall) && require_utils._isString(block.functionCall.name) && require_utils._isObject(block.functionCall.args)) {
				yield {
					type: "tool_call",
					id: message.id,
					name: block.functionCall.name,
					args: block.functionCall.args
				};
				continue;
			} else if (require_utils._isContentBlock(block, "functionResponse")) {
				yield {
					type: "non_standard",
					value: block
				};
				continue;
			} else if (require_utils._isContentBlock(block, "fileData") && require_utils._isObject(block.fileData) && require_utils._isString(block.fileData.mimeType) && require_utils._isString(block.fileData.fileUri)) {
				yield {
					type: "file",
					mimeType: block.fileData.mimeType,
					fileId: block.fileData.fileUri
				};
				continue;
			} else if (require_utils._isContentBlock(block, "executableCode")) {
				yield {
					type: "non_standard",
					value: block
				};
				continue;
			} else if (require_utils._isContentBlock(block, "codeExecutionResult")) {
				yield {
					type: "non_standard",
					value: block
				};
				continue;
			}
			yield {
				type: "non_standard",
				value: block
			};
		}
	}
	return Array.from(iterateContent());
}
const ChatGoogleGenAITranslator = {
	translateContent: convertToV1FromChatGoogleMessage,
	translateContentChunk: convertToV1FromChatGoogleMessage
};
//#endregion
exports.ChatGoogleGenAITranslator = ChatGoogleGenAITranslator;

//# sourceMappingURL=google_genai.cjs.map