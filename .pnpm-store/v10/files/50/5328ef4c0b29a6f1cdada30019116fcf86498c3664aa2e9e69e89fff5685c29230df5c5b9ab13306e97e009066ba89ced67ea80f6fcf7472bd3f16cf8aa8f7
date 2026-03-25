import { __export } from "../_virtual/rolldown_runtime.js";
import { isOpenAITool } from "@langchain/core/language_models/base";
import { isInteropZodSchema } from "@langchain/core/utils/types";
import { toJsonSchema } from "@langchain/core/utils/json_schema";

//#region src/tools/render.ts
var render_exports = {};
__export(render_exports, {
	renderTextDescription: () => renderTextDescription,
	renderTextDescriptionAndArgs: () => renderTextDescriptionAndArgs
});
/**
* Render the tool name and description in plain text.
*
* Output will be in the format of:
* ```
* search: This tool is used for search
* calculator: This tool is used for math
* ```
* @param tools
* @returns a string of all tools and their descriptions
*/
function renderTextDescription(tools) {
	if (tools.every(isOpenAITool)) return tools.map((tool) => `${tool.function.name}${tool.function.description ? `: ${tool.function.description}` : ""}`).join("\n");
	return tools.map((tool) => `${tool.name}: ${tool.description}`).join("\n");
}
/**
* Render the tool name, description, and args in plain text.
* Output will be in the format of:'
* ```
* search: This tool is used for search, args: {"query": {"type": "string"}}
* calculator: This tool is used for math,
* args: {"expression": {"type": "string"}}
* ```
* @param tools
* @returns a string of all tools, their descriptions and a stringified version of their schemas
*/
function renderTextDescriptionAndArgs(tools) {
	if (tools.every(isOpenAITool)) return tools.map((tool) => `${tool.function.name}${tool.function.description ? `: ${tool.function.description}` : ""}, args: ${JSON.stringify(tool.function.parameters)}`).join("\n");
	return tools.map((tool) => {
		const jsonSchema = isInteropZodSchema(tool.schema) ? toJsonSchema(tool.schema) : tool.schema;
		return `${tool.name}: ${tool.description}, args: ${JSON.stringify(jsonSchema?.properties)}`;
	}).join("\n");
}

//#endregion
export { renderTextDescription, renderTextDescriptionAndArgs, render_exports };
//# sourceMappingURL=render.js.map