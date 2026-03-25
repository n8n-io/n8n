//#region src/language_models/utils.ts
const iife = (fn) => fn();
function castStandardMessageContent(message) {
	const Cls = message.constructor;
	return new Cls({
		...message,
		content: message.contentBlocks,
		response_metadata: {
			...message.response_metadata,
			output_version: "v1"
		}
	});
}
function parseMetadataInvocationParams(invocationParams) {
	return Object.fromEntries(Object.entries(invocationParams).filter(([k, v]) => k !== "tools" && v !== null && v !== void 0));
}
//#endregion
export { castStandardMessageContent, iife, parseMetadataInvocationParams };

//# sourceMappingURL=utils.js.map