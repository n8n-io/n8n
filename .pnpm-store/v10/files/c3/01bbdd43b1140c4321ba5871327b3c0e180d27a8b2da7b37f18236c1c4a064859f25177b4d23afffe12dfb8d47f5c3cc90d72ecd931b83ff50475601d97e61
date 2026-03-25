//#region src/messages/content/data.ts
/**
* @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
*/
function isDataContentBlock(content_block) {
	return typeof content_block === "object" && content_block !== null && "type" in content_block && typeof content_block.type === "string" && "source_type" in content_block && (content_block.source_type === "url" || content_block.source_type === "base64" || content_block.source_type === "text" || content_block.source_type === "id");
}
/**
* @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
*/
function isURLContentBlock(content_block) {
	return isDataContentBlock(content_block) && content_block.source_type === "url" && "url" in content_block && typeof content_block.url === "string";
}
/**
* @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
*/
function isBase64ContentBlock(content_block) {
	return isDataContentBlock(content_block) && content_block.source_type === "base64" && "data" in content_block && typeof content_block.data === "string";
}
/**
* @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
*/
function isPlainTextContentBlock(content_block) {
	return isDataContentBlock(content_block) && content_block.source_type === "text" && "text" in content_block && typeof content_block.text === "string";
}
/**
* @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
*/
function isIDContentBlock(content_block) {
	return isDataContentBlock(content_block) && content_block.source_type === "id" && "id" in content_block && typeof content_block.id === "string";
}
/**
* @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
*/
function convertToOpenAIImageBlock(content_block) {
	if (isDataContentBlock(content_block)) {
		if (content_block.source_type === "url") return {
			type: "image_url",
			image_url: { url: content_block.url }
		};
		if (content_block.source_type === "base64") {
			if (!content_block.mime_type) throw new Error("mime_type key is required for base64 data.");
			return {
				type: "image_url",
				image_url: { url: `data:${content_block.mime_type};base64,${content_block.data}` }
			};
		}
	}
	throw new Error("Unsupported source type. Only 'url' and 'base64' are supported.");
}
/**
* Utility function for ChatModelProviders. Parses a mime type into a type, subtype, and parameters.
*
* @param mime_type - The mime type to parse.
* @returns An object containing the type, subtype, and parameters.
*
* @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
*/
function parseMimeType(mime_type) {
	const parts = mime_type.split(";")[0].split("/");
	if (parts.length !== 2) throw new Error(`Invalid mime type: "${mime_type}" - does not match type/subtype format.`);
	const type = parts[0].trim();
	const subtype = parts[1].trim();
	if (type === "" || subtype === "") throw new Error(`Invalid mime type: "${mime_type}" - type or subtype is empty.`);
	const parameters = {};
	for (const parameterKvp of mime_type.split(";").slice(1)) {
		const parameterParts = parameterKvp.split("=");
		if (parameterParts.length !== 2) throw new Error(`Invalid parameter syntax in mime type: "${mime_type}".`);
		const key = parameterParts[0].trim();
		const value = parameterParts[1].trim();
		if (key === "") throw new Error(`Invalid parameter syntax in mime type: "${mime_type}".`);
		parameters[key] = value;
	}
	return {
		type,
		subtype,
		parameters
	};
}
/**
* Utility function for ChatModelProviders. Parses a base64 data URL into a typed array or string.
*
* @param dataUrl - The base64 data URL to parse.
* @param asTypedArray - Whether to return the data as a typed array.
* @returns The parsed data and mime type, or undefined if the data URL is invalid.
*
* @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
*/
function parseBase64DataUrl({ dataUrl: data_url, asTypedArray = false }) {
	const formatMatch = data_url.match(/^data:(\w+\/\w+);base64,([A-Za-z0-9+/]+=*)$/);
	let mime_type;
	if (formatMatch) {
		mime_type = formatMatch[1].toLowerCase();
		const data = asTypedArray ? Uint8Array.from(atob(formatMatch[2]), (c) => c.charCodeAt(0)) : formatMatch[2];
		return {
			mime_type,
			data
		};
	}
}
/**
* Convert from a standard data content block to a provider's proprietary data content block format.
*
* Don't override this method. Instead, override the more specific conversion methods and use this
* method unmodified.
*
* @param block - The standard data content block to convert.
* @returns The provider data content block.
* @throws An error if the standard data content block type is not supported.
*
* @deprecated Don't use data content blocks. Use {@link ContentBlock.Multimodal.Data} instead.
*/
function convertToProviderContentBlock(block, converter) {
	if (block.type === "text") {
		if (!converter.fromStandardTextBlock) throw new Error(`Converter for ${converter.providerName} does not implement \`fromStandardTextBlock\` method.`);
		return converter.fromStandardTextBlock(block);
	}
	if (block.type === "image") {
		if (!converter.fromStandardImageBlock) throw new Error(`Converter for ${converter.providerName} does not implement \`fromStandardImageBlock\` method.`);
		return converter.fromStandardImageBlock(block);
	}
	if (block.type === "audio") {
		if (!converter.fromStandardAudioBlock) throw new Error(`Converter for ${converter.providerName} does not implement \`fromStandardAudioBlock\` method.`);
		return converter.fromStandardAudioBlock(block);
	}
	if (block.type === "file") {
		if (!converter.fromStandardFileBlock) throw new Error(`Converter for ${converter.providerName} does not implement \`fromStandardFileBlock\` method.`);
		return converter.fromStandardFileBlock(block);
	}
	throw new Error(`Unable to convert content block type '${block.type}' to provider-specific format: not recognized.`);
}
//#endregion
export { convertToOpenAIImageBlock, convertToProviderContentBlock, isBase64ContentBlock, isDataContentBlock, isIDContentBlock, isPlainTextContentBlock, isURLContentBlock, parseBase64DataUrl, parseMimeType };

//# sourceMappingURL=data.js.map