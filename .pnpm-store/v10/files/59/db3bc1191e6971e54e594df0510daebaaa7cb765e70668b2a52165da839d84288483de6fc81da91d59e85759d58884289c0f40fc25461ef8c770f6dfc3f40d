//#region src/utils/errors.ts
function addLangChainErrorFields(error, lc_error_code) {
	error.lc_error_code = lc_error_code;
	error.message = `${error.message}\n\nTroubleshooting URL: https://docs.langchain.com/oss/javascript/langchain/errors/${lc_error_code}/\n`;
	return error;
}

//#endregion
export { addLangChainErrorFields };
//# sourceMappingURL=errors.js.map