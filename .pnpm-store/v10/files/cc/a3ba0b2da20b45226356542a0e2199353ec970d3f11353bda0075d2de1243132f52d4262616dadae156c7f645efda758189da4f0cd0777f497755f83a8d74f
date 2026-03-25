import { isInteropZodSchema } from "../utils/types/zod.js";
import { Runnable } from "../runnables/base.js";
//#region src/tools/types.ts
/**
* Confirm whether the inputted tool is an instance of `StructuredToolInterface`.
*
* @param {StructuredToolInterface | JSONSchema | undefined} tool The tool to check if it is an instance of `StructuredToolInterface`.
* @returns {tool is StructuredToolInterface} Whether the inputted tool is an instance of `StructuredToolInterface`.
*/
function isStructuredTool(tool) {
	return tool !== void 0 && Array.isArray(tool.lc_namespace);
}
/**
* Confirm whether the inputted tool is an instance of `RunnableToolLike`.
*
* @param {unknown | undefined} tool The tool to check if it is an instance of `RunnableToolLike`.
* @returns {tool is RunnableToolLike} Whether the inputted tool is an instance of `RunnableToolLike`.
*/
function isRunnableToolLike(tool) {
	return tool !== void 0 && Runnable.isRunnable(tool) && "lc_name" in tool.constructor && typeof tool.constructor.lc_name === "function" && tool.constructor.lc_name() === "RunnableToolLike";
}
/**
* Confirm whether or not the tool contains the necessary properties to be considered a `StructuredToolParams`.
*
* @param {unknown | undefined} tool The object to check if it is a `StructuredToolParams`.
* @returns {tool is StructuredToolParams} Whether the inputted object is a `StructuredToolParams`.
*/
function isStructuredToolParams(tool) {
	return !!tool && typeof tool === "object" && "name" in tool && "schema" in tool && (isInteropZodSchema(tool.schema) || tool.schema != null && typeof tool.schema === "object" && "type" in tool.schema && typeof tool.schema.type === "string" && [
		"null",
		"boolean",
		"object",
		"array",
		"number",
		"string"
	].includes(tool.schema.type));
}
/**
* Whether or not the tool is one of StructuredTool, RunnableTool or StructuredToolParams.
* It returns `is StructuredToolParams` since that is the most minimal interface of the three,
* while still containing the necessary properties to be passed to a LLM for tool calling.
*
* @param {unknown | undefined} tool The tool to check if it is a LangChain tool.
* @returns {tool is StructuredToolParams} Whether the inputted tool is a LangChain tool.
*/
function isLangChainTool(tool) {
	return isStructuredToolParams(tool) || isRunnableToolLike(tool) || isStructuredTool(tool);
}
//#endregion
export { isLangChainTool, isRunnableToolLike, isStructuredTool, isStructuredToolParams };

//# sourceMappingURL=types.js.map