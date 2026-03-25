import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { toJsonSchema } from "./json_schema.js";
import { isLangChainTool, isRunnableToolLike, isStructuredTool, isStructuredToolParams } from "../tools/types.js";
//#region src/utils/function_calling.ts
var function_calling_exports = /* @__PURE__ */ __exportAll({
	convertToOpenAIFunction: () => convertToOpenAIFunction,
	convertToOpenAITool: () => convertToOpenAITool,
	isLangChainTool: () => isLangChainTool,
	isRunnableToolLike: () => isRunnableToolLike,
	isStructuredTool: () => isStructuredTool,
	isStructuredToolParams: () => isStructuredToolParams
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
		parameters: toJsonSchema(tool.schema),
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
	if (isLangChainTool(tool)) toolDef = {
		type: "function",
		function: convertToOpenAIFunction(tool)
	};
	else toolDef = tool;
	if (fieldsCopy?.strict !== void 0) toolDef.function.strict = fieldsCopy.strict;
	return toolDef;
}
//#endregion
export { convertToOpenAIFunction, convertToOpenAITool, function_calling_exports, isLangChainTool, isRunnableToolLike, isStructuredTool, isStructuredToolParams };

//# sourceMappingURL=function_calling.js.map