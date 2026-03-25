const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));

//#region src/utils/content.ts
function _isAnthropicThinkingBlock(block) {
	return typeof block === "object" && block !== null && "type" in block && block.type === "thinking";
}
function _isAnthropicRedactedThinkingBlock(block) {
	return typeof block === "object" && block !== null && "type" in block && block.type === "redacted_thinking";
}
function _isAnthropicSearchResultBlock(block) {
	return typeof block === "object" && block !== null && "type" in block && block.type === "search_result";
}
function _isAnthropicImageBlockParam(block) {
	if (typeof block !== "object" || block == null) return false;
	if (!("type" in block) || block.type !== "image") return false;
	if (!("source" in block) || typeof block.source !== "object" || block.source == null) return false;
	if (!("type" in block.source)) return false;
	if (block.source.type === "base64") {
		if (!("media_type" in block.source)) return false;
		if (typeof block.source.media_type !== "string") return false;
		if (!("data" in block.source)) return false;
		if (typeof block.source.data !== "string") return false;
		return true;
	}
	if (block.source.type === "url") {
		if (!("url" in block.source)) return false;
		if (typeof block.source.url !== "string") return false;
		return true;
	}
	return false;
}
const standardContentBlockConverter = {
	providerName: "anthropic",
	fromStandardTextBlock(block) {
		return {
			type: "text",
			text: block.text,
			..."citations" in (block.metadata ?? {}) ? { citations: block.metadata.citations } : {},
			..."cache_control" in (block.metadata ?? {}) ? { cache_control: block.metadata.cache_control } : {}
		};
	},
	fromStandardImageBlock(block) {
		if (block.source_type === "url") {
			const data = (0, __langchain_core_messages.parseBase64DataUrl)({
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
					url: block.url
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
					url: block.url
				},
				..."cache_control" in (block.metadata ?? {}) ? { cache_control: block.metadata.cache_control } : {},
				..."citations" in (block.metadata ?? {}) ? { citations: block.metadata.citations } : {},
				..."context" in (block.metadata ?? {}) ? { context: block.metadata.context } : {},
				..."title" in (block.metadata ?? {}) ? { title: block.metadata.title } : {}
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

//#endregion
exports._isAnthropicImageBlockParam = _isAnthropicImageBlockParam;
exports._isAnthropicRedactedThinkingBlock = _isAnthropicRedactedThinkingBlock;
exports._isAnthropicSearchResultBlock = _isAnthropicSearchResultBlock;
exports._isAnthropicThinkingBlock = _isAnthropicThinkingBlock;
exports.standardContentBlockConverter = standardContentBlockConverter;
//# sourceMappingURL=content.cjs.map