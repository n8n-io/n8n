const require_utils = require("./utils.cjs");
//#region src/messages/block_translators/google.ts
function convertToV1FromChatGoogleMessage(message) {
	function* iterateContent() {
		const content = require_utils.iife(() => {
			if (typeof message.content === "string") if (message.additional_kwargs.originalTextContentBlock) return [{
				...message.additional_kwargs.originalTextContentBlock,
				type: "text"
			}];
			else return [{
				type: "text",
				text: message.content
			}];
			else {
				const originalBlock = message.additional_kwargs?.originalTextContentBlock;
				if (originalBlock?.thoughtSignature) {
					if (!message.content.some((b) => "thoughtSignature" in b)) {
						const result = [...message.content];
						for (let i = result.length - 1; i >= 0; i--) {
							const block = result[i];
							if (block.type === "text" && !block.thought) {
								block.thoughtSignature = originalBlock.thoughtSignature;
								return result;
							}
						}
					}
				}
				return message.content;
			}
		});
		for (const block of content) {
			const contentBlockBase = require_utils.iife(() => {
				if (require_utils._isContentBlock(block, "text") && require_utils._isString(block.text)) return {
					type: "text",
					text: block.text
				};
				else if (require_utils._isContentBlock(block, "inlineData") && require_utils._isObject(block.inlineData) && require_utils._isString(block.inlineData.mimeType) && require_utils._isString(block.inlineData.data)) return {
					type: "file",
					mimeType: block.inlineData.mimeType,
					data: block.inlineData.data
				};
				else if (require_utils._isContentBlock(block, "functionCall") && require_utils._isObject(block.functionCall) && require_utils._isString(block.functionCall.name) && require_utils._isObject(block.functionCall.args)) return {
					type: "tool_call",
					id: message.id,
					name: block.functionCall.name,
					args: block.functionCall.args
				};
				else if (require_utils._isContentBlock(block, "functionResponse")) return {
					type: "non_standard",
					value: block
				};
				else if (require_utils._isContentBlock(block, "fileData") && require_utils._isObject(block.fileData) && require_utils._isString(block.fileData.mimeType) && require_utils._isString(block.fileData.fileUri)) return {
					type: "file",
					mimeType: block.fileData.mimeType,
					fileId: block.fileData.fileUri
				};
				else if (require_utils._isContentBlock(block, "executableCode")) return {
					type: "non_standard",
					value: block
				};
				else if (require_utils._isContentBlock(block, "codeExecutionResult")) return {
					type: "non_standard",
					value: block
				};
				return {
					type: "non_standard",
					value: block
				};
			});
			const contentBlock = require_utils.iife(() => {
				if ("thought" in block && block.thought) return {
					type: "reasoning",
					reasoning: contentBlockBase.type === "text" ? contentBlockBase.text : "",
					reasoningContentBlock: contentBlockBase
				};
				else return contentBlockBase;
			});
			const ret = {
				thought: block.thought,
				thoughtSignature: block.thoughtSignature,
				partMetadata: block.partMetadata,
				...contentBlock
			};
			for (const attribute in ret) if (ret[attribute] === void 0) delete ret[attribute];
			yield ret;
		}
	}
	return Array.from(iterateContent());
}
const ChatGoogleTranslator = {
	translateContent: convertToV1FromChatGoogleMessage,
	translateContentChunk: convertToV1FromChatGoogleMessage
};
//#endregion
exports.ChatGoogleTranslator = ChatGoogleTranslator;

//# sourceMappingURL=google.cjs.map