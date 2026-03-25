import { isBase64ContentBlock, isIDContentBlock, isURLContentBlock, parseBase64DataUrl } from "../content/data.js";
import { _isContentBlock, _isObject, _isString } from "./utils.js";
//#region src/messages/block_translators/data.ts
function convertToV1FromDataContentBlock(block) {
	if (isURLContentBlock(block)) return {
		type: block.type,
		mimeType: block.mime_type,
		url: block.url,
		metadata: block.metadata
	};
	if (isBase64ContentBlock(block)) return {
		type: block.type,
		mimeType: block.mime_type ?? "application/octet-stream",
		data: block.data,
		metadata: block.metadata
	};
	if (isIDContentBlock(block)) return {
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
	if (_isContentBlock(block, "image_url") && _isObject(block.image_url)) return true;
	if (_isContentBlock(block, "input_audio") && _isObject(block.input_audio)) return true;
	if (_isContentBlock(block, "file") && _isObject(block.file)) return true;
	return false;
}
function convertToV1FromOpenAIDataBlock(block) {
	if (_isContentBlock(block, "image_url") && _isObject(block.image_url) && _isString(block.image_url.url)) {
		const parsed = parseBase64DataUrl({ dataUrl: block.image_url.url });
		if (parsed) return {
			type: "image",
			mimeType: parsed.mime_type,
			data: parsed.data
		};
		else return {
			type: "image",
			url: block.image_url.url
		};
	} else if (_isContentBlock(block, "input_audio") && _isObject(block.input_audio) && _isString(block.input_audio.data) && _isString(block.input_audio.format)) return {
		type: "audio",
		data: block.input_audio.data,
		mimeType: `audio/${block.input_audio.format}`
	};
	else if (_isContentBlock(block, "file") && _isObject(block.file) && _isString(block.file.data)) {
		const parsed = parseBase64DataUrl({ dataUrl: block.file.data });
		if (parsed) return {
			type: "file",
			data: parsed.data,
			mimeType: parsed.mime_type
		};
		else if (_isString(block.file.file_id)) return {
			type: "file",
			fileId: block.file.file_id
		};
	}
	return block;
}
//#endregion
export { convertToV1FromDataContent, convertToV1FromOpenAIDataBlock, isOpenAIDataBlock };

//# sourceMappingURL=data.js.map