Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_utils_json_schema = require("./json_schema.cjs");
const require_types = require("../tools/types.cjs");
//#region src/utils/function_calling.ts
var function_calling_exports = /* @__PURE__ */ require_runtime.__exportAll({
	convertToOpenAIFunction: () => convertToOpenAIFunction,
	convertToOpenAITool: () => convertToOpenAITool,
	isLangChainTool: () => require_types.isLangChainTool,
	isRunnableToolLike: () => require_types.isRunnableToolLike,
	isStructuredTool: () => require_types.isStructuredTool,
	isStructuredToolParams: () => require_types.isStructuredToolParams
});
/**
* Formats a `StructuredTool` or `RunnableToolLike` instance into a format
* that is compatible with OpenAI function calling. If `StructuredTool` or
* `RunnableToolLike` has a zod schema, the output will be converted into a
* JSON schema, which is then used as the parameters for the OpenAI tool.
*
* @param {StructuredToolInterface | RunnableToolLike} tool The tool to convert to an OpenAI function.
* @returns {FunctionDefinition} The inputted tool in OpenAI function format.
*/
function convertToOpenAIFunction(tool, fields) {
	const fieldsCopy = typeof fields === "number" ? void 0 : fields;
	return {
		name: tool.name,
		description: tool.description,
		parameters: require_utils_json_schema.toJsonSchema(tool.schema),
		...fieldsCopy?.strict !== void 0 ? { strict: fieldsCopy.strict } : {}
	};
}
/**
* Formats a `StructuredTool` or `RunnableToolLike` instance into a
* format that is compatible with OpenAI tool calling. If `StructuredTool` or
* `RunnableToolLike` has a zod schema, the output will be converted into a
* JSON schema, which is then used as the parameters for the OpenAI tool.
*
* @param {StructuredToolInterface | Record<string, any> | RunnableToolLike} tool The tool to convert to an OpenAI tool.
* @returns {ToolDefinition} The inputted tool in OpenAI tool format.
*/
function convertToOpenAITool(tool, fields) {
	const fieldsCopy = typeof fields === "number" ? void 0 : fields;
	let toolDef;
	if (require_types.isLangChainTool(tool)) toolDef = {
		type: "function",
		function: convertToOpenAIFunction(tool)
	};
	else toolDef = tool;
	if (fieldsCopy?.strict !== void 0) toolDef.function.strict = fieldsCopy.strict;
	return toolDef;
}
//#endregion
exports.convertToOpenAIFunction = convertToOpenAIFunction;
exports.convertToOpenAITool = convertToOpenAITool;
Object.defineProperty(exports, "function_calling_exports", {
	enumerable: true,
	get: function() {
		return function_calling_exports;
	}
});
exports.isLangChainTool = require_types.isLangChainTool;
exports.isRunnableToolLike = require_types.isRunnableToolLike;
exports.isStructuredTool = require_types.isStructuredTool;
exports.isStructuredToolParams = require_types.isStructuredToolParams;

//# sourceMappingURL=function_calling.cjs.map