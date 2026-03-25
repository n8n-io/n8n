import { GeminiToolAttributes } from "../types.js";
import { jsonSchemaToGeminiParameters, schemaToGeminiParameters } from "./zod_to_gemini_parameters.js";
import { isModelGemini, isModelGemma, normalizeSpeechConfig, validateGeminiParams } from "./gemini.js";
import { isModelClaude, validateClaudeParams } from "./anthropic.js";
import { isOpenAITool } from "@langchain/core/language_models/base";
import { isLangChainTool } from "@langchain/core/utils/function_calling";

//#region src/utils/common.ts
function copyAIModelParams(params, options) {
	return copyAIModelParamsInto(params, options, {});
}
function processToolChoice(toolChoice, allowedFunctionNames) {
	if (!toolChoice) {
		if (allowedFunctionNames) return {
			tool_choice: "any",
			allowed_function_names: allowedFunctionNames
		};
		return;
	}
	if (toolChoice === "any" || toolChoice === "auto" || toolChoice === "none") return {
		tool_choice: toolChoice,
		allowed_function_names: allowedFunctionNames
	};
	if (typeof toolChoice === "string") return {
		tool_choice: "any",
		allowed_function_names: [...allowedFunctionNames ?? [], toolChoice]
	};
	throw new Error("Object inputs for tool_choice not supported.");
}
function isGeminiTool(tool) {
	for (const toolAttribute of GeminiToolAttributes) if (toolAttribute in tool) return true;
	return false;
}
function isGeminiNonFunctionTool(tool) {
	return isGeminiTool(tool) && !("functionDeclaration" in tool);
}
function convertToGeminiTools(tools) {
	const geminiTools = [];
	let functionDeclarationsIndex = -1;
	tools.forEach((tool) => {
		if (isGeminiNonFunctionTool(tool)) geminiTools.push(tool);
		else {
			if (functionDeclarationsIndex === -1) {
				geminiTools.push({ functionDeclarations: [] });
				functionDeclarationsIndex = geminiTools.length - 1;
			}
			if ("functionDeclarations" in tool && Array.isArray(tool.functionDeclarations)) {
				const funcs = tool.functionDeclarations;
				geminiTools[functionDeclarationsIndex].functionDeclarations.push(...funcs);
			} else if (isLangChainTool(tool)) try {
				const jsonSchema = schemaToGeminiParameters(tool.schema);
				geminiTools[functionDeclarationsIndex].functionDeclarations.push({
					name: tool.name,
					description: tool.description ?? `A function available to call.`,
					parameters: jsonSchema
				});
			} catch (error) {
				const errorMessage = error && typeof error === "object" && "message" in error ? String(error.message) : String(error);
				throw new Error(`Failed to convert tool '${tool.name}' schema for Gemini: ${errorMessage}. `);
			}
			else if (isOpenAITool(tool)) geminiTools[functionDeclarationsIndex].functionDeclarations.push({
				name: tool.function.name,
				description: tool.function.description ?? `A function available to call.`,
				parameters: jsonSchemaToGeminiParameters(tool.function.parameters)
			});
			else throw new Error(`Received invalid tool: ${JSON.stringify(tool)}`);
		}
	});
	return geminiTools;
}
function reasoningEffortToReasoningTokens(_modelName, effort) {
	if (effort === void 0) return;
	const maxEffort = 24 * 1024;
	switch (effort) {
		case "low": return 1024;
		case "medium": return 8 * 1024;
		case "high": return maxEffort;
		default: return;
	}
}
function copyAIModelParamsInto(params, options, target) {
	const ret = target || {};
	const model = options?.model ?? params?.model ?? target.model;
	ret.modelName = model ?? options?.modelName ?? params?.modelName ?? target.modelName;
	ret.model = model;
	ret.temperature = options?.temperature ?? params?.temperature ?? target.temperature;
	ret.maxOutputTokens = options?.maxOutputTokens ?? params?.maxOutputTokens ?? target.maxOutputTokens;
	ret.maxReasoningTokens = options?.maxReasoningTokens ?? params?.maxReasoningTokens ?? target?.maxReasoningTokens ?? options?.thinkingBudget ?? params?.thinkingBudget ?? target?.thinkingBudget ?? reasoningEffortToReasoningTokens(ret.modelName, params?.reasoningEffort) ?? reasoningEffortToReasoningTokens(ret.modelName, target?.reasoningEffort) ?? reasoningEffortToReasoningTokens(ret.modelName, options?.reasoningEffort);
	ret.topP = options?.topP ?? params?.topP ?? target.topP;
	ret.topK = options?.topK ?? params?.topK ?? target.topK;
	ret.seed = options?.seed ?? params?.seed ?? target.seed;
	ret.presencePenalty = options?.presencePenalty ?? params?.presencePenalty ?? target.presencePenalty;
	ret.frequencyPenalty = options?.frequencyPenalty ?? params?.frequencyPenalty ?? target.frequencyPenalty;
	ret.stopSequences = options?.stopSequences ?? params?.stopSequences ?? target.stopSequences;
	ret.safetySettings = options?.safetySettings ?? params?.safetySettings ?? target.safetySettings;
	ret.logprobs = options?.logprobs ?? params?.logprobs ?? target.logprobs;
	ret.topLogprobs = options?.topLogprobs ?? params?.topLogprobs ?? target.topLogprobs;
	ret.thinkingLevel = options?.thinkingLevel ?? params?.thinkingLevel ?? target?.thinkingLevel;
	ret.reasoningLevel = options?.reasoningLevel ?? params?.reasoningLevel ?? target?.reasoningLevel;
	ret.convertSystemMessageToHumanContent = options?.convertSystemMessageToHumanContent ?? params?.convertSystemMessageToHumanContent ?? target?.convertSystemMessageToHumanContent;
	ret.responseMimeType = options?.responseMimeType ?? params?.responseMimeType ?? target?.responseMimeType;
	ret.responseSchema = options?.responseSchema ?? params?.responseSchema ?? target?.responseSchema;
	ret.responseModalities = options?.responseModalities ?? params?.responseModalities ?? target?.responseModalities;
	ret.speechConfig = normalizeSpeechConfig(options?.speechConfig ?? params?.speechConfig ?? target?.speechConfig);
	ret.streaming = options?.streaming ?? params?.streaming ?? target?.streaming;
	const toolChoice = processToolChoice(options?.tool_choice, options?.allowed_function_names);
	if (toolChoice) {
		ret.tool_choice = toolChoice.tool_choice;
		ret.allowed_function_names = toolChoice.allowed_function_names;
	}
	const tools = options?.tools;
	if (tools) ret.tools = convertToGeminiTools(tools);
	if (options?.cachedContent) ret.cachedContent = options.cachedContent;
	ret.labels = options?.labels ?? params?.labels ?? target?.labels;
	return ret;
}
function modelToFamily(modelName) {
	if (!modelName) return null;
	else if (isModelGemini(modelName)) return "gemini";
	else if (isModelGemma(modelName)) return "gemma";
	else if (isModelClaude(modelName)) return "claude";
	else return null;
}
function modelToPublisher(modelName) {
	switch (modelToFamily(modelName)) {
		case "gemini":
		case "gemma":
		case "palm": return "google";
		case "claude": return "anthropic";
		default: return "unknown";
	}
}
function validateModelParams(params) {
	const testParams = params ?? {};
	switch (modelToFamily(testParams.model ?? testParams.modelName)) {
		case "gemini":
		case "gemma": return validateGeminiParams(testParams);
		case "claude": return /* @__PURE__ */ validateClaudeParams(testParams);
		default: throw new Error(`Unable to verify model params: ${JSON.stringify(params)}`);
	}
}
function copyAndValidateModelParamsInto(params, target) {
	copyAIModelParamsInto(params, void 0, target);
	validateModelParams(target);
	return target;
}

//#endregion
export { convertToGeminiTools, copyAIModelParams, copyAIModelParamsInto, copyAndValidateModelParamsInto, modelToFamily, modelToPublisher, validateModelParams };
//# sourceMappingURL=common.js.map