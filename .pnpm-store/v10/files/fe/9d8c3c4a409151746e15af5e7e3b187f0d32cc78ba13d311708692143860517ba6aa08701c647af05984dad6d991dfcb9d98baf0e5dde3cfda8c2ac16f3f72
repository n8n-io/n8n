const require_utils = require("./utils.cjs");
//#region src/messages/block_translators/google_vertexai.ts
function convertToV1FromChatVertexMessage(message) {
	function* iterateContent() {
		const content = typeof message.content === "string" ? [{
			type: "text",
			text: message.content
		}] : message.content;
		for (const block of content) {
			if (require_utils._isContentBlock(block, "reasoning") && require_utils._isString(block.reasoning)) {
				const signature = require_utils.iife(() => {
					const reasoningIndex = content.indexOf(block);
					if (require_utils._isArray(message.additional_kwargs?.signatures) && reasoningIndex >= 0) return message.additional_kwargs.signatures.at(reasoningIndex);
				});
				if (require_utils._isString(signature)) yield {
					type: "reasoning",
					reasoning: block.reasoning,
					signature
				};
				else yield {
					type: "reasoning",
					reasoning: block.reasoning
				};
				continue;
			} else if (require_utils._isContentBlock(block, "thinking") && require_utils._isString(block.thinking)) {
				yield {
					type: "reasoning",
					reasoning: block.thinking,
					...block.signature ? { signature: block.signature } : {}
				};
				continue;
			} else if (require_utils._isContentBlock(block, "text") && require_utils._isString(block.text)) {
				yield {
					type: "text",
					text: block.text
				};
				continue;
			} else if (require_utils._isContentBlock(block, "image_url")) {
				if (require_utils._isString(block.image_url)) if (block.image_url.startsWith("data:")) {
					const match = block.image_url.match(/^data:([^;]+);base64,(.+)$/);
					if (match) yield {
						type: "image",
						data: match[2],
						mimeType: match[1]
					};
					else yield {
						type: "image",
						url: block.image_url
					};
				} else yield {
					type: "image",
					url: block.image_url
				};
				continue;
			} else if (require_utils._isContentBlock(block, "media") && require_utils._isString(block.mimeType) && require_utils._isString(block.data)) {
				yield {
					type: "file",
					mimeType: block.mimeType,
					data: block.data
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
const ChatVertexTranslator = {
	translateContent: convertToV1FromChatVertexMessage,
	translateContentChunk: convertToV1FromChatVertexMessage
};
//#endregion
exports.ChatVertexTranslator = ChatVertexTranslator;

//# sourceMappingURL=google_vertexai.cjs.map