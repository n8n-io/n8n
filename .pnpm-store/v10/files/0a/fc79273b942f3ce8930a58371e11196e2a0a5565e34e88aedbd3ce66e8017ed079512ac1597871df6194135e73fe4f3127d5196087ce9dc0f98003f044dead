const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_function_calling = require_rolldown_runtime.__toESM(require("@langchain/core/utils/function_calling"));
const __langchain_core_utils_types = require_rolldown_runtime.__toESM(require("@langchain/core/utils/types"));
const __langchain_core_utils_json_schema = require_rolldown_runtime.__toESM(require("@langchain/core/utils/json_schema"));

//#region src/utils/tools.ts
/**
* Formats a tool in either OpenAI format, or LangChain structured tool format
* into an OpenAI tool format. If the tool is already in OpenAI format, return without
* any changes. If it is in LangChain structured tool format, convert it to OpenAI tool format
* using OpenAI's `zodFunction` util, falling back to `convertToOpenAIFunction` if the parameters
* returned from the `zodFunction` util are not defined.
*
* @param {BindToolsInput} tool The tool to convert to an OpenAI tool.
* @param {Object} [fields] Additional fields to add to the OpenAI tool.
* @returns {ToolDefinition} The inputted tool in OpenAI tool format.
*/
function _convertToOpenAITool(tool, fields) {
	let toolDef;
	if ((0, __langchain_core_utils_function_calling.isLangChainTool)(tool)) toolDef = (0, __langchain_core_utils_function_calling.convertToOpenAITool)(tool);
	else toolDef = tool;
	if (fields?.strict !== void 0) toolDef.function.strict = fields.strict;
	return toolDef;
}
function isAnyOfProp(prop) {
	return prop.anyOf !== void 0 && Array.isArray(prop.anyOf);
}
function formatFunctionDefinitions(functions) {
	const lines = ["namespace functions {", ""];
	for (const f of functions) {
		if (f.description) lines.push(`// ${f.description}`);
		if (Object.keys(f.parameters.properties ?? {}).length > 0) {
			lines.push(`type ${f.name} = (_: {`);
			lines.push(formatObjectProperties(f.parameters, 0));
			lines.push("}) => any;");
		} else lines.push(`type ${f.name} = () => any;`);
		lines.push("");
	}
	lines.push("} // namespace functions");
	return lines.join("\n");
}
function formatObjectProperties(obj, indent) {
	const lines = [];
	for (const [name, param] of Object.entries(obj.properties ?? {})) {
		if (param.description && indent < 2) lines.push(`// ${param.description}`);
		if (obj.required?.includes(name)) lines.push(`${name}: ${formatType(param, indent)},`);
		else lines.push(`${name}?: ${formatType(param, indent)},`);
	}
	return lines.map((line) => " ".repeat(indent) + line).join("\n");
}
function formatType(param, indent) {
	if (isAnyOfProp(param)) return param.anyOf.map((v) => formatType(v, indent)).join(" | ");
	switch (param.type) {
		case "string":
			if (param.enum) return param.enum.map((v) => `"${v}"`).join(" | ");
			return "string";
		case "number":
			if (param.enum) return param.enum.map((v) => `${v}`).join(" | ");
			return "number";
		case "integer":
			if (param.enum) return param.enum.map((v) => `${v}`).join(" | ");
			return "number";
		case "boolean": return "boolean";
		case "null": return "null";
		case "object": return [
			"{",
			formatObjectProperties(param, indent + 2),
			"}"
		].join("\n");
		case "array":
			if (param.items) return `${formatType(param.items, indent)}[]`;
			return "any[]";
		default: return "";
	}
}
function formatToOpenAIToolChoice(toolChoice) {
	if (!toolChoice) return void 0;
	else if (toolChoice === "any" || toolChoice === "required") return "required";
	else if (toolChoice === "auto") return "auto";
	else if (toolChoice === "none") return "none";
	else if (typeof toolChoice === "string") return {
		type: "function",
		function: { name: toolChoice }
	};
	else return toolChoice;
}
function isBuiltInTool(tool) {
	return "type" in tool && tool.type !== "function";
}
function isBuiltInToolChoice(tool_choice) {
	return tool_choice != null && typeof tool_choice === "object" && "type" in tool_choice && tool_choice.type !== "function";
}
function isCustomTool(tool) {
	return typeof tool === "object" && tool !== null && "metadata" in tool && typeof tool.metadata === "object" && tool.metadata !== null && "customTool" in tool.metadata && typeof tool.metadata.customTool === "object" && tool.metadata.customTool !== null;
}
function isOpenAICustomTool(tool) {
	return "type" in tool && tool.type === "custom" && "custom" in tool && typeof tool.custom === "object" && tool.custom !== null;
}
function parseCustomToolCall(rawToolCall) {
	if (rawToolCall.type !== "custom_tool_call") return void 0;
	return {
		...rawToolCall,
		type: "tool_call",
		call_id: rawToolCall.id,
		id: rawToolCall.call_id,
		name: rawToolCall.name,
		isCustomTool: true,
		args: { input: rawToolCall.input }
	};
}
function isCustomToolCall(toolCall) {
	return toolCall.type === "tool_call" && "isCustomTool" in toolCall && toolCall.isCustomTool === true;
}
function convertCompletionsCustomTool(tool) {
	const getFormat = () => {
		if (!tool.custom.format) return void 0;
		if (tool.custom.format.type === "grammar") return {
			type: "grammar",
			definition: tool.custom.format.grammar.definition,
			syntax: tool.custom.format.grammar.syntax
		};
		if (tool.custom.format.type === "text") return { type: "text" };
		return void 0;
	};
	return {
		type: "custom",
		name: tool.custom.name,
		description: tool.custom.description,
		format: getFormat()
	};
}
function convertResponsesCustomTool(tool) {
	const getFormat = () => {
		if (!tool.format) return void 0;
		if (tool.format.type === "grammar") return {
			type: "grammar",
			grammar: {
				definition: tool.format.definition,
				syntax: tool.format.syntax
			}
		};
		if (tool.format.type === "text") return { type: "text" };
		return void 0;
	};
	return {
		type: "custom",
		custom: {
			name: tool.name,
			description: tool.description,
			format: getFormat()
		}
	};
}

//#endregion
exports._convertToOpenAITool = _convertToOpenAITool;
exports.convertCompletionsCustomTool = convertCompletionsCustomTool;
exports.convertResponsesCustomTool = convertResponsesCustomTool;
exports.formatFunctionDefinitions = formatFunctionDefinitions;
exports.formatToOpenAIToolChoice = formatToOpenAIToolChoice;
exports.isBuiltInTool = isBuiltInTool;
exports.isBuiltInToolChoice = isBuiltInToolChoice;
exports.isCustomTool = isCustomTool;
exports.isCustomToolCall = isCustomToolCall;
exports.isOpenAICustomTool = isOpenAICustomTool;
exports.parseCustomToolCall = parseCustomToolCall;
//# sourceMappingURL=tools.cjs.map