
//#region src/utils/errors.ts
function addLangChainErrorFields(error, lc_error_code) {
	error.lc_error_code = lc_error_code;
	error.message = `${error.message}\n\nTroubleshooting URL: https://docs.langchain.com/oss/javascript/langchain/errors/${lc_error_code}/\n`;
	return error;
}
function wrapAnthropicClientError(e) {
	let error;
	if (e.status === 400 && e.message.includes("tool")) error = addLangChainErrorFields(e, "INVALID_TOOL_RESULTS");
	else if (e.status === 401) error = addLangChainErrorFields(e, "MODEL_AUTHENTICATION");
	else if (e.status === 404) error = addLangChainErrorFields(e, "MODEL_NOT_FOUND");
	else if (e.status === 429) error = addLangChainErrorFields(e, "MODEL_RATE_LIMIT");
	else error = e;
	return error;
}

//#endregion
exports.wrapAnthropicClientError = wrapAnthropicClientError;
//# sourceMappingURL=errors.cjs.map