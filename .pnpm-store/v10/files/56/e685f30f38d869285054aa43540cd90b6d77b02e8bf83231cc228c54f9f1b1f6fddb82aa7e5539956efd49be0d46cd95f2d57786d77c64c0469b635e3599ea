import { _isContentBlock, _isObject, _isString } from "./utils.js";
//#region src/messages/block_translators/google_genai.ts
function convertToV1FromChatGoogleMessage(message) {
	function* iterateContent() {
		const content = typeof message.content === "string" ? [{
			type: "text",
			text: message.content
		}] : message.content;
		for (const block of content) {
			if (_isContentBlock(block, "text") && _isString(block.text)) {
				yield {
					type: "text",
					text: block.text
				};
				continue;
			} else if (_isContentBlock(block, "thinking") && _isString(block.thinking)) {
				yield {
					type: "reasoning",
					reasoning: block.thinking,
					...block.signature ? { signature: block.signature } : {}
				};
				continue;
			} else if (_isContentBlock(block, "inlineData") && _isObject(block.inlineData) && _isString(block.inlineData.mimeType) && _isString(block.inlineData.data)) {
				yield {
					type: "file",
					mimeType: block.inlineData.mimeType,
					data: block.inlineData.data
				};
				continue;
			} else if (_isContentBlock(block, "functionCall") && _isObject(block.functionCall) && _isString(block.functionCall.name) && _isObject(block.functionCall.args)) {
				yield {
					type: "tool_call",
					id: message.id,
					name: block.functionCall.name,
					args: block.functionCall.args
				};
				continue;
			} else if (_isContentBlock(block, "functionResponse")) {
				yield {
					type: "non_standard",
					value: block
				};
				continue;
			} else if (_isContentBlock(block, "fileData") && _isObject(block.fileData) && _isString(block.fileData.mimeType) && _isString(block.fileData.fileUri)) {
				yield {
					type: "file",
					mimeType: block.fileData.mimeType,
					fileId: block.fileData.fileUri
				};
				continue;
			} else if (_isContentBlock(block, "executableCode")) {
				yield {
					type: "non_standard",
					value: block
				};
				continue;
			} else if (_isContentBlock(block, "codeExecutionResult")) {
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
export { ChatGoogleGenAITranslator };

//# sourceMappingURL=google_genai.js.map