//#region src/utils/zod-to-json-schema/errorMessages.ts
function addErrorMessage(res, key, errorMessage, refs) {
	if (!refs?.errorMessages) return;
	if (errorMessage) res.errorMessage = {
		...res.errorMessage,
		[key]: errorMessage
	};
}
function setResponseValueAndErrors(res, key, value, errorMessage, refs) {
	res[key] = value;
	addErrorMessage(res, key, errorMessage, refs);
}
//#endregion
exports.addErrorMessage = addErrorMessage;
exports.setResponseValueAndErrors = setResponseValueAndErrors;

//# sourceMappingURL=errorMessages.cjs.map