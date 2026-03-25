const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_language_models_base = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/base"));
const __langchain_core_utils_types = require_rolldown_runtime.__toESM(require("@langchain/core/utils/types"));
const __langchain_core_utils_json_schema = require_rolldown_runtime.__toESM(require("@langchain/core/utils/json_schema"));

//#region src/tools/render.ts
var render_exports = {};
require_rolldown_runtime.__export(render_exports, {
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
	if (tools.every(__langchain_core_language_models_base.isOpenAITool)) return tools.map((tool) => `${tool.function.name}${tool.function.description ? `: ${tool.function.description}` : ""}`).join("\n");
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
	if (tools.every(__langchain_core_language_models_base.isOpenAITool)) return tools.map((tool) => `${tool.function.name}${tool.function.description ? `: ${tool.function.description}` : ""}, args: ${JSON.stringify(tool.function.parameters)}`).join("\n");
	return tools.map((tool) => {
		const jsonSchema = (0, __langchain_core_utils_types.isInteropZodSchema)(tool.schema) ? (0, __langchain_core_utils_json_schema.toJsonSchema)(tool.schema) : tool.schema;
		return `${tool.name}: ${tool.description}, args: ${JSON.stringify(jsonSchema?.properties)}`;
	}).join("\n");
}

//#endregion
exports.renderTextDescription = renderTextDescription;
exports.renderTextDescriptionAndArgs = renderTextDescriptionAndArgs;
Object.defineProperty(exports, 'render_exports', {
  enumerable: true,
  get: function () {
    return render_exports;
  }
});
//# sourceMappingURL=render.cjs.map