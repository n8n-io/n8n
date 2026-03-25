import { removeAdditionalProperties } from "./zod_to_genai_parameters.js";
import { convertToGenerativeAITools } from "./common.js";
import { FunctionCallingMode } from "@google/generative-ai";
import { isLangChainTool } from "@langchain/core/utils/function_calling";
import { isOpenAITool } from "@langchain/core/language_models/base";

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
		if (isLangChainTool(tool)) {
			const [convertedTool] = convertToGenerativeAITools([tool]);
			if (convertedTool.functionDeclarations) functionDeclarationTools.push(...convertedTool.functionDeclarations);
		} else if (isOpenAITool(tool)) {
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
		parameters: removeAdditionalProperties(tool.function.parameters)
	}] };
}
function createToolConfig(genAITools, extra) {
	if (!genAITools.length || !extra) return void 0;
	const { toolChoice, allowedFunctionNames } = extra;
	const modeMap = {
		any: FunctionCallingMode.ANY,
		auto: FunctionCallingMode.AUTO,
		none: FunctionCallingMode.NONE
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
		mode: FunctionCallingMode.ANY,
		allowedFunctionNames: [...allowedFunctionNames ?? [], ...toolChoice && typeof toolChoice === "string" ? [toolChoice] : []]
	} };
}

//#endregion
export { convertToolsToGenAI };
//# sourceMappingURL=tools.js.map