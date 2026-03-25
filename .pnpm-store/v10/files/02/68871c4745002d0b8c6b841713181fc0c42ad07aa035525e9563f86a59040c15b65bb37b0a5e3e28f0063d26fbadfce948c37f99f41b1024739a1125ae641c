//#region src/messages/block_translators/utils.ts
function _isContentBlock(block, type) {
	return _isObject(block) && block.type === type;
}
function _isObject(value) {
	return typeof value === "object" && value !== null;
}
function _isArray(value) {
	return Array.isArray(value);
}
function _isString(value) {
	return typeof value === "string";
}
function _isNumber(value) {
	return typeof value === "number";
}
function _isBytesArray(value) {
	return value instanceof Uint8Array;
}
function safeParseJson(value) {
	try {
		return JSON.parse(value);
	} catch {
		return;
	}
}
const iife = (fn) => fn();
//#endregion
export { _isArray, _isBytesArray, _isContentBlock, _isNumber, _isObject, _isString, iife, safeParseJson };

//# sourceMappingURL=utils.js.map