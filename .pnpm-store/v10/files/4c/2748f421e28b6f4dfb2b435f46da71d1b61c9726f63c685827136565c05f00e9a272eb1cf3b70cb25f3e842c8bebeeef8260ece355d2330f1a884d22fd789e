//#region src/tools/utils.ts
function _isToolCall(toolCall) {
	return !!(toolCall && typeof toolCall === "object" && "type" in toolCall && toolCall.type === "tool_call");
}
function _configHasToolCallId(config) {
	return !!(config && typeof config === "object" && "toolCall" in config && config.toolCall != null && typeof config.toolCall === "object" && "id" in config.toolCall && typeof config.toolCall.id === "string");
}
/**
* Custom error class used to handle exceptions related to tool input parsing.
* It extends the built-in `Error` class and adds an optional `output`
* property that can hold the output that caused the exception.
*/
var ToolInputParsingException = class extends Error {
	output;
	constructor(message, output) {
		super(message);
		this.output = output;
	}
};
//#endregion
export { ToolInputParsingException, _configHasToolCallId, _isToolCall };

//# sourceMappingURL=utils.js.map