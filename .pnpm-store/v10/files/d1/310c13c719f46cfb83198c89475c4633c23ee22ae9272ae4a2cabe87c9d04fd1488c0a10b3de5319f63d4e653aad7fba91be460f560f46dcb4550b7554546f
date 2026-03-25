//#region src/utils.ts
const TOOL_CALL_ID_PATTERN = /^[a-zA-Z0-9]{9}$/;
function _isValidMistralToolCallId(toolCallId) {
	return TOOL_CALL_ID_PATTERN.test(toolCallId);
}
function _base62Encode(num) {
	let numCopy = num;
	const base62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	if (numCopy === 0) return base62[0];
	const arr = [];
	const base = 62;
	while (numCopy) {
		arr.push(base62[numCopy % base]);
		numCopy = Math.floor(numCopy / base);
	}
	return arr.reverse().join("");
}
function _simpleHash(str) {
	let hash = 0;
	for (let i = 0; i < str.length; i += 1) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash &= hash;
	}
	return Math.abs(hash);
}
function _convertToolCallIdToMistralCompatible(toolCallId) {
	if (_isValidMistralToolCallId(toolCallId)) return toolCallId;
	else {
		const hash = _simpleHash(toolCallId);
		const base62Str = _base62Encode(hash);
		if (base62Str.length >= 9) return base62Str.slice(0, 9);
		else return base62Str.padStart(9, "0");
	}
}
function _mistralContentChunkToMessageContentComplex(content) {
	if (!content) return "";
	if (typeof content === "string") return content;
	return content.map((contentChunk) => {
		if (contentChunk.type === "image_url") {
			if (typeof contentChunk.imageUrl !== "string" && contentChunk.imageUrl?.detail) {
				const { detail } = contentChunk.imageUrl;
				if (detail !== "high" && detail !== "auto" && detail !== "low") return {
					type: contentChunk.type,
					image_url: { url: contentChunk.imageUrl.url }
				};
			}
			return {
				type: contentChunk.type,
				image_url: contentChunk.imageUrl
			};
		}
		return contentChunk;
	});
}

//#endregion
export { _convertToolCallIdToMistralCompatible, _mistralContentChunkToMessageContentComplex };
//# sourceMappingURL=utils.js.map