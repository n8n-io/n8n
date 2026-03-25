const require_zod_to_genai_parameters = require('./zod_to_genai_parameters.cjs');
const require_common = require('./common.cjs');
let _google_generative_ai = require("@google/generative-ai");
let _langchain_core_utils_function_calling = require("@langchain/core/utils/function_calling");
let _langchain_core_language_models_base = require("@langchain/core/language_models/base");

//#region src/utils/tools.ts
function convertToolsToGenAI(tools, extra) {
	const genAITools = processTools(tools);
	return {
		tools: genAITools,
		toolConfig: createToolConfig(genAITools, extra)
	};
}
function processTools(tools) {
	let functionDeclarationTools = [];
	const genAITools = [];
	tools.forEach((tool) => {
		if ((0, _langchain_core_utils_function_calling.isLangChainTool)(tool)) {
			const [convertedTool] = require_common.convertToGenerativeAITools([tool]);
			if (convertedTool.functionDeclarations) functionDeclarationTools.push(...convertedTool.functionDeclarations);
		} else if ((0, _langchain_core_language_models_base.isOpenAITool)(tool)) {
			const { functionDeclarations } = convertOpenAIToolToGenAI(tool);
			if (functionDeclarations) functionDeclarationTools.push(...functionDeclarations);
			else throw new Error("Failed to convert OpenAI structured tool to GenerativeAI tool");
		} else genAITools.push(tool);
	});
	if (genAITools.find((t) => "functionDeclarations" in t)) return genAITools.map((tool) => {
		if (functionDeclarationTools?.length > 0 && "functionDeclarations" in tool) {
			const newTool = { functionDeclarations: [...tool.functionDeclarations || [], ...functionDeclarationTools] };
			functionDeclarationTools = [];
			return newTool;
		}
		return tool;
	});
	return [...genAITools, ...functionDeclarationTools.length > 0 ? [{ functionDeclarations: functionDeclarationTools }] : []];
}
function convertOpenAIToolToGenAI(tool) {
	return { functionDeclarations: [{
		name: tool.function.name,
		description: tool.function.description,
		parameters: require_zod_to_genai_parameters.removeAdditionalProperties(tool.function.parameters)
	}] };
}
function createToolConfig(genAITools, extra) {
	if (!genAITools.length || !extra) return void 0;
	const { toolChoice, allowedFunctionNames } = extra;
	const modeMap = {
		any: _google_generative_ai.FunctionCallingMode.ANY,
		auto: _google_generative_ai.FunctionCallingMode.AUTO,
		none: _google_generative_ai.FunctionCallingMode.NONE
	};
	if (toolChoice && [
		"any",
		"auto",
		"none"
	].includes(toolChoice)) return { functionCallingConfig: {
		mode: modeMap[toolChoice] ?? "MODE_UNSPECIFIED",
		allowedFunctionNames
	} };
	if (typeof toolChoice === "string" || allowedFunctionNames) return { functionCallingConfig: {
		mode: _google_generative_ai.FunctionCallingMode.ANY,
		allowedFunctionNames: [...allowedFunctionNames ?? [], ...toolChoice && typeof toolChoice === "string" ? [toolChoice] : []]
	} };
}

//#endregion
exports.convertToolsToGenAI = convertToolsToGenAI;
//# sourceMappingURL=tools.cjs.map