import { _isArray, _isBytesArray, _isContentBlock, _isNumber, _isObject, _isString, iife } from "./utils.js";
//#region src/messages/block_translators/bedrock_converse.ts
function convertFileFormatToMimeType(format) {
	switch (format) {
		case "csv": return "text/csv";
		case "doc": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
		case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
		case "html": return "text/html";
		case "md": return "text/markdown";
		case "pdf": return "application/pdf";
		case "txt": return "text/plain";
		case "xls": return "application/vnd.ms-excel";
		case "xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
		case "gif": return "image/gif";
		case "jpeg": return "image/jpeg";
		case "jpg": return "image/jpeg";
		case "png": return "image/png";
		case "webp": return "image/webp";
		case "flv": return "video/flv";
		case "mkv": return "video/mkv";
		case "mov": return "video/mov";
		case "mp4": return "video/mp4";
		case "mpeg": return "video/mpeg";
		case "mpg": return "video/mpg";
		case "three_gp": return "video/three_gp";
		case "webm": return "video/webm";
		case "wmv": return "video/wmv";
		default: return "application/octet-stream";
	}
}
function convertConverseDocumentBlock(block) {
	if (_isObject(block.document) && _isObject(block.document.source)) {
		const mimeType = convertFileFormatToMimeType(_isObject(block.document) && _isString(block.document.format) ? block.document.format : "");
		if (_isObject(block.document.source)) {
			if (_isObject(block.document.source.s3Location) && _isString(block.document.source.s3Location.uri)) return {
				type: "file",
				mimeType,
				fileId: block.document.source.s3Location.uri
			};
			if (_isBytesArray(block.document.source.bytes)) return {
				type: "file",
				mimeType,
				data: block.document.source.bytes
			};
			if (_isString(block.document.source.text)) return {
				type: "file",
				mimeType,
				data: Buffer.from(block.document.source.text).toString("base64")
			};
			if (_isArray(block.document.source.content)) return {
				type: "file",
				mimeType,
				data: block.document.source.content.reduce((acc, item) => {
					if (_isObject(item) && _isString(item.text)) return acc + item.text;
					return acc;
				}, "")
			};
		}
	}
	return {
		type: "non_standard",
		value: block
	};
}
function convertConverseImageBlock(block) {
	if (_isContentBlock(block, "image") && _isObject(block.image)) {
		const mimeType = convertFileFormatToMimeType(_isObject(block.image) && _isString(block.image.format) ? block.image.format : "");
		if (_isObject(block.image.source)) {
			if (_isObject(block.image.source.s3Location) && _isString(block.image.source.s3Location.uri)) return {
				type: "image",
				mimeType,
				fileId: block.image.source.s3Location.uri
			};
			if (_isBytesArray(block.image.source.bytes)) return {
				type: "image",
				mimeType,
				data: block.image.source.bytes
			};
		}
	}
	return {
		type: "non_standard",
		value: block
	};
}
function convertConverseVideoBlock(block) {
	if (_isContentBlock(block, "video") && _isObject(block.video)) {
		const mimeType = convertFileFormatToMimeType(_isObject(block.video) && _isString(block.video.format) ? block.video.format : "");
		if (_isObject(block.video.source)) {
			if (_isObject(block.video.source.s3Location) && _isString(block.video.source.s3Location.uri)) return {
				type: "video",
				mimeType,
				fileId: block.video.source.s3Location.uri
			};
			if (_isBytesArray(block.video.source.bytes)) return {
				type: "video",
				mimeType,
				data: block.video.source.bytes
			};
		}
	}
	return {
		type: "non_standard",
		value: block
	};
}
function convertToV1FromChatBedrockConverseMessage(message) {
	function* iterateContent() {
		const content = typeof message.content === "string" ? [{
			type: "text",
			text: message.content
		}] : message.content;
		for (const block of content) {
			if (_isContentBlock(block, "cache_point")) {
				yield {
					type: "non_standard",
					value: block
				};
				continue;
			} else if (_isContentBlock(block, "citations_content") && _isObject(block.citationsContent)) {
				yield {
					type: "text",
					text: _isArray(block.citationsContent.content) ? block.citationsContent.content.reduce((acc, item) => {
						if (_isObject(item) && _isString(item.text)) return acc + item.text;
						return acc;
					}, "") : "",
					annotations: _isArray(block.citationsContent.citations) ? block.citationsContent.citations.reduce((acc, item) => {
						if (_isObject(item)) {
							const citedText = _isArray(item.sourceContent) ? item.sourceContent.reduce((acc, item) => {
								if (_isObject(item) && _isString(item.text)) return acc + item.text;
								return acc;
							}, "") : "";
							const properties = iife(() => {
								if (_isObject(item.location)) {
									const location = item.location.documentChar || item.location.documentPage || item.location.documentChunk;
									if (_isObject(location)) return {
										source: _isNumber(location.documentIndex) ? location.documentIndex.toString() : void 0,
										startIndex: _isNumber(location.start) ? location.start : void 0,
										endIndex: _isNumber(location.end) ? location.end : void 0
									};
								}
								return {};
							});
							acc.push({
								type: "citation",
								citedText,
								...properties
							});
						}
						return acc;
					}, []) : []
				};
				continue;
			} else if (_isContentBlock(block, "document") && _isObject(block.document)) {
				yield convertConverseDocumentBlock(block);
				continue;
			} else if (_isContentBlock(block, "guard_content")) {
				yield {
					type: "non_standard",
					value: block
				};
				continue;
			} else if (_isContentBlock(block, "image") && _isObject(block.image)) {
				yield convertConverseImageBlock(block);
				continue;
			} else if (_isContentBlock(block, "reasoning_content") && _isString(block.reasoningText)) {
				yield {
					type: "reasoning",
					reasoning: block.reasoningText
				};
				continue;
			} else if (_isContentBlock(block, "text") && _isString(block.text)) {
				yield {
					type: "text",
					text: block.text
				};
				continue;
			} else if (_isContentBlock(block, "tool_result")) {
				yield {
					type: "non_standard",
					value: block
				};
				continue;
			} else if (_isContentBlock(block, "tool_call")) continue;
			else if (_isContentBlock(block, "video") && _isObject(block.video)) {
				yield convertConverseVideoBlock(block);
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
const ChatBedrockConverseTranslator = {
	translateContent: convertToV1FromChatBedrockConverseMessage,
	translateContentChunk: convertToV1FromChatBedrockConverseMessage
};
//#endregion
export { ChatBedrockConverseTranslator };

//# sourceMappingURL=bedrock_converse.js.map