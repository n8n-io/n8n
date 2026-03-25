const require_data = require("../content/data.cjs");
const require_utils = require("./utils.cjs");
//#region src/messages/block_translators/data.ts
function convertToV1FromDataContentBlock(block) {
	if (require_data.isURLContentBlock(block)) return {
		type: block.type,
		mimeType: block.mime_type,
		url: block.url,
		metadata: block.metadata
	};
	if (require_data.isBase64ContentBlock(block)) return {
		type: block.type,
		mimeType: block.mime_type ?? "application/octet-stream",
		data: block.data,
		metadata: block.metadata
	};
	if (require_data.isIDContentBlock(block)) return {
		type: block.type,
		mimeType: block.mime_type,
		fileId: block.id,
		metadata: block.metadata
	};
	return block;
}
function convertToV1FromDataContent(content) {
	return content.map(convertToV1FromDataContentBlock);
}
function isOpenAIDataBlock(block) {
	if (require_utils._isContentBlock(block, "image_url") && require_utils._isObject(block.image_url)) return true;
	if (require_utils._isContentBlock(block, "input_audio") && require_utils._isObject(block.input_audio)) return true;
	if (require_utils._isContentBlock(block, "file") && require_utils._isObject(block.file)) return true;
	return false;
}
function convertToV1FromOpenAIDataBlock(block) {
	if (require_utils._isContentBlock(block, "image_url") && require_utils._isObject(block.image_url) && require_utils._isString(block.image_url.url)) {
		const parsed = require_data.parseBase64DataUrl({ dataUrl: block.image_url.url });
		if (parsed) return {
			type: "image",
			mimeType: parsed.mime_type,
			data: parsed.data
		};
		else return {
			type: "image",
			url: block.image_url.url
		};
	} else if (require_utils._isContentBlock(block, "input_audio") && require_utils._isObject(block.input_audio) && require_utils._isString(block.input_audio.data) && require_utils._isString(block.input_audio.format)) return {
		type: "audio",
		data: block.input_audio.data,
		mimeType: `audio/${block.input_audio.format}`
	};
	else if (require_utils._isContentBlock(block, "file") && require_utils._isObject(block.file) && require_utils._isString(block.file.data)) {
		const parsed = require_data.parseBase64DataUrl({ dataUrl: block.file.data });
		if (parsed) return {
			type: "file",
			data: parsed.data,
			mimeType: parsed.mime_type
		};
		else if (require_utils._isString(block.file.file_id)) return {
			type: "file",
			fileId: block.file.file_id
		};
	}
	return block;
}
//#endregion
exports.convertToV1FromDataContent = convertToV1FromDataContent;
exports.convertToV1FromOpenAIDataBlock = convertToV1FromOpenAIDataBlock;
exports.isOpenAIDataBlock = isOpenAIDataBlock;

//# sourceMappingURL=data.cjs.map