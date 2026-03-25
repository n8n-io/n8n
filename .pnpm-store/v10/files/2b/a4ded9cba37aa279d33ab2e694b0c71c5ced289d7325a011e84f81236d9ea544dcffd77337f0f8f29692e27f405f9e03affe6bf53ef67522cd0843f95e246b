import { jsonSchemaToGeminiParameters, schemaToGenerativeAIParameters } from "./zod_to_genai_parameters.js";
import { assertNoEmptyStringEnums } from "./validate_schema.js";
import { AIMessage, AIMessageChunk, ChatMessage, convertToProviderContentBlock, isAIMessage, isBaseMessage, isDataContentBlock, isToolMessage, parseBase64DataUrl } from "@langchain/core/messages";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import { isLangChainTool } from "@langchain/core/utils/function_calling";
import { isOpenAITool } from "@langchain/core/language_models/base";
import { v4 } from "uuid";

//#region src/utils/common.ts
const _FUNCTION_CALL_THOUGHT_SIGNATURES_MAP_KEY = "__gemini_function_call_thought_signatures__";
const DUMMY_SIGNATURE = "ErYCCrMCAdHtim9kOoOkrPiCNVsmlpMIKd7ZMxgiFbVQOkgp7nlLcDMzVsZwIzvuT7nQROivoXA72ccC2lSDvR0Gh7dkWaGuj7ctv6t7ZceHnecx0QYa+ix8tYpRfjhyWozQ49lWiws6+YGjCt10KRTyWsZ2h6O7iHTYJwKIRwGUHRKy/qK/6kFxJm5ML00gLq4D8s5Z6DBpp2ZlR+uF4G8jJgeWQgyHWVdx2wGYElaceVAc66tZdPQRdOHpWtgYSI1YdaXgVI8KHY3/EfNc2YqqMIulvkDBAnuMhkAjV9xmBa54Tq+ih3Im4+r3DzqhGqYdsSkhS0kZMwte4Hjs65dZzCw9lANxIqYi1DJ639WNPYihp/DCJCos7o+/EeSPJaio5sgWDyUnMGkY1atsJZ+m7pj7DD5tvQ==";
const iife = (fn) => fn();
function getMessageAuthor(message) {
	if (ChatMessage.isInstance(message)) return message.role;
	return message.type;
}
/**
* Maps a message type to a Google Generative AI chat author.
* @param message The message to map.
* @param model The model to use for mapping.
* @returns The message type mapped to a Google Generative AI chat author.
*/
function convertAuthorToRole(author) {
	switch (author) {
		case "supervisor":
		case "ai":
		case "model": return "model";
		case "system": return "system";
		case "human": return "user";
		case "tool":
		case "function": return "function";
		default: throw new Error(`Unknown / unsupported author: ${author}`);
	}
}
function messageContentMedia(content) {
	if ("mimeType" in content && "data" in content) return { inlineData: {
		mimeType: content.mimeType,
		data: content.data
	} };
	if ("mimeType" in content && "fileUri" in content) return { fileData: {
		mimeType: content.mimeType,
		fileUri: content.fileUri
	} };
	throw new Error("Invalid media content");
}
function inferToolNameFromPreviousMessages(message, previousMessages) {
	return previousMessages.map((msg) => {
		if (isAIMessage(msg)) return msg.tool_calls ?? [];
		return [];
	}).flat().find((toolCall) => {
		return toolCall.id === message.tool_call_id;
	})?.name;
}
function _getStandardContentBlockConverter(isMultimodalModel) {
	return {
		providerName: "Google Gemini",
		fromStandardTextBlock(block) {
			return { text: block.text };
		},
		fromStandardImageBlock(block) {
			if (!isMultimodalModel) throw new Error("This model does not support images");
			if (block.source_type === "url") {
				const data = parseBase64DataUrl({ dataUrl: block.url });
				if (data) return { inlineData: {
					mimeType: data.mime_type,
					data: data.data
				} };
				else return { fileData: {
					mimeType: block.mime_type ?? "",
					fileUri: block.url
				} };
			}
			if (block.source_type === "base64") return { inlineData: {
				mimeType: block.mime_type ?? "",
				data: block.data
			} };
			throw new Error(`Unsupported source type: ${block.source_type}`);
		},
		fromStandardAudioBlock(block) {
			if (!isMultimodalModel) throw new Error("This model does not support audio");
			if (block.source_type === "url") {
				const data = parseBase64DataUrl({ dataUrl: block.url });
				if (data) return { inlineData: {
					mimeType: data.mime_type,
					data: data.data
				} };
				else return { fileData: {
					mimeType: block.mime_type ?? "",
					fileUri: block.url
				} };
			}
			if (block.source_type === "base64") return { inlineData: {
				mimeType: block.mime_type ?? "",
				data: block.data
			} };
			throw new Error(`Unsupported source type: ${block.source_type}`);
		},
		fromStandardFileBlock(block) {
			if (!isMultimodalModel) throw new Error("This model does not support files");
			if (block.source_type === "text") return { text: block.text };
			if (block.source_type === "url") {
				const data = parseBase64DataUrl({ dataUrl: block.url });
				if (data) return { inlineData: {
					mimeType: data.mime_type,
					data: data.data
				} };
				else return { fileData: {
					mimeType: block.mime_type ?? "",
					fileUri: block.url
				} };
			}
			if (block.source_type === "base64") return { inlineData: {
				mimeType: block.mime_type ?? "",
				data: block.data
			} };
			throw new Error(`Unsupported source type: ${block.source_type}`);
		}
	};
}
function _convertLangChainContentToPart(content, isMultimodalModel) {
	if (isDataContentBlock(content)) return convertToProviderContentBlock(content, _getStandardContentBlockConverter(isMultimodalModel));
	if (content.type === "text") return { text: content.text };
	else if (content.type === "executableCode") return { executableCode: content.executableCode };
	else if (content.type === "codeExecutionResult") return { codeExecutionResult: content.codeExecutionResult };
	else if (content.type === "image_url") {
		if (!isMultimodalModel) throw new Error(`This model does not support images`);
		let source;
		if (typeof content.image_url === "string") source = content.image_url;
		else if (typeof content.image_url === "object" && "url" in content.image_url) source = content.image_url.url;
		else throw new Error("Please provide image as base64 encoded data URL");
		const [dm, data] = source.split(",");
		if (!dm.startsWith("data:")) throw new Error("Please provide image as base64 encoded data URL");
		const [mimeType, encoding] = dm.replace(/^data:/, "").split(";");
		if (encoding !== "base64") throw new Error("Please provide image as base64 encoded data URL");
		return { inlineData: {
			data,
			mimeType
		} };
	} else if (content.type === "media") return messageContentMedia(content);
	else if (content.type === "tool_use") return { functionCall: {
		name: content.name,
		args: content.input
	} };
	else if (content.type === "tool_call") return { functionCall: {
		name: content.name,
		args: content.args
	} };
	else if (content.type?.includes("/") && content.type.split("/").length === 2 && "data" in content && typeof content.data === "string") return { inlineData: {
		mimeType: content.type,
		data: content.data
	} };
	else if ("functionCall" in content) return;
	else if ("type" in content) throw new Error(`Unknown content type ${content.type}`);
	else throw new Error(`Unknown content ${JSON.stringify(content)}`);
}
function convertMessageContentToParts(message, isMultimodalModel, previousMessages, model) {
	if (isToolMessage(message)) {
		const messageName = message.name ?? inferToolNameFromPreviousMessages(message, previousMessages);
		if (messageName === void 0) throw new Error(`Google requires a tool name for each tool call response, and we could not infer a called tool name for ToolMessage "${message.id}" from your passed messages. Please populate a "name" field on that ToolMessage explicitly.`);
		const result = Array.isArray(message.content) ? message.content.map((c) => _convertLangChainContentToPart(c, isMultimodalModel)).filter((p) => p !== void 0) : message.content;
		if (message.status === "error") return [{ functionResponse: {
			name: messageName,
			response: { error: { details: result } }
		} }];
		return [{ functionResponse: {
			name: messageName,
			response: { result }
		} }];
	}
	let functionCalls = [];
	const messageParts = [];
	if (typeof message.content === "string" && message.content) messageParts.push({ text: message.content });
	if (Array.isArray(message.content)) messageParts.push(...message.content.map((c) => _convertLangChainContentToPart(c, isMultimodalModel)).filter((p) => p !== void 0));
	const functionThoughtSignatures = message.additional_kwargs?.[_FUNCTION_CALL_THOUGHT_SIGNATURES_MAP_KEY];
	if (isAIMessage(message) && message.tool_calls?.length) functionCalls = message.tool_calls.map((tc) => {
		const thoughtSignature = iife(() => {
			if (tc.id) {
				const signature = functionThoughtSignatures?.[tc.id];
				if (signature) return signature;
			}
			if (model?.includes("gemini-3")) return DUMMY_SIGNATURE;
			return "";
		});
		return {
			functionCall: {
				name: tc.name,
				args: tc.args
			},
			...thoughtSignature ? { thoughtSignature } : {}
		};
	});
	return [...messageParts, ...functionCalls];
}
function convertBaseMessagesToContent(messages, isMultimodalModel, convertSystemMessageToHumanContent = false, model) {
	return messages.reduce((acc, message, index) => {
		if (!isBaseMessage(message)) throw new Error("Unsupported message input");
		const author = getMessageAuthor(message);
		if (author === "system" && index !== 0) throw new Error("System message should be the first one");
		const role = convertAuthorToRole(author);
		const prevContent = acc.content[acc.content.length];
		if (!acc.mergeWithPreviousContent && prevContent && prevContent.role === role) throw new Error("Google Generative AI requires alternate messages between authors");
		const parts = convertMessageContentToParts(message, isMultimodalModel, messages.slice(0, index), model);
		if (acc.mergeWithPreviousContent) {
			const prevContent = acc.content[acc.content.length - 1];
			if (!prevContent) throw new Error("There was a problem parsing your system message. Please try a prompt without one.");
			prevContent.parts.push(...parts);
			return {
				mergeWithPreviousContent: false,
				content: acc.content
			};
		}
		let actualRole = role;
		if (actualRole === "function" || actualRole === "system" && !convertSystemMessageToHumanContent) actualRole = "user";
		const content = {
			role: actualRole,
			parts
		};
		return {
			mergeWithPreviousContent: author === "system" && !convertSystemMessageToHumanContent,
			content: [...acc.content, content]
		};
	}, {
		content: [],
		mergeWithPreviousContent: false
	}).content;
}
function mapGenerateContentResultToChatResult(response, extra) {
	if (!response.candidates || response.candidates.length === 0 || !response.candidates[0]) return {
		generations: [],
		llmOutput: { filters: response.promptFeedback }
	};
	const [candidate] = response.candidates;
	const { content: candidateContent, ...generationInfo } = candidate;
	const functionCalls = candidateContent.parts?.reduce((acc, p) => {
		if ("functionCall" in p && p.functionCall) acc.push({
			...p,
			id: "id" in p.functionCall && typeof p.functionCall.id === "string" ? p.functionCall.id : v4()
		});
		return acc;
	}, []);
	let content;
	const parts = candidateContent?.parts;
	if (Array.isArray(parts) && parts.length === 1 && "text" in parts[0] && parts[0].text && !parts[0].thought) content = parts[0].text;
	else if (Array.isArray(parts) && parts.length > 0) content = parts.map((p) => {
		if (p.thought && "text" in p && p.text) return {
			type: "thinking",
			thinking: p.text,
			...p.thoughtSignature ? { signature: p.thoughtSignature } : {}
		};
		else if ("text" in p) return {
			type: "text",
			text: p.text
		};
		else if ("inlineData" in p) return {
			type: "inlineData",
			inlineData: p.inlineData
		};
		else if ("functionCall" in p) return {
			type: "functionCall",
			functionCall: p.functionCall
		};
		else if ("functionResponse" in p) return {
			type: "functionResponse",
			functionResponse: p.functionResponse
		};
		else if ("fileData" in p) return {
			type: "fileData",
			fileData: p.fileData
		};
		else if ("executableCode" in p) return {
			type: "executableCode",
			executableCode: p.executableCode
		};
		else if ("codeExecutionResult" in p) return {
			type: "codeExecutionResult",
			codeExecutionResult: p.codeExecutionResult
		};
		return p;
	});
	else content = [];
	const functionThoughtSignatures = functionCalls?.reduce((acc, fc) => {
		if ("thoughtSignature" in fc && typeof fc.thoughtSignature === "string") acc[fc.id] = fc.thoughtSignature;
		return acc;
	}, {});
	let text = "";
	if (typeof content === "string") text = content;
	else if (Array.isArray(content) && content.length > 0) text = content.find((b) => "text" in b)?.text ?? text;
	return {
		generations: [{
			text,
			message: new AIMessage({
				content: content ?? "",
				tool_calls: functionCalls?.map((fc) => ({
					type: "tool_call",
					id: fc.id,
					name: fc.functionCall.name,
					args: fc.functionCall.args
				})),
				additional_kwargs: {
					...generationInfo,
					[_FUNCTION_CALL_THOUGHT_SIGNATURES_MAP_KEY]: functionThoughtSignatures
				},
				usage_metadata: extra?.usageMetadata
			}),
			generationInfo
		}],
		llmOutput: { tokenUsage: {
			promptTokens: extra?.usageMetadata?.input_tokens,
			completionTokens: extra?.usageMetadata?.output_tokens,
			totalTokens: extra?.usageMetadata?.total_tokens
		} }
	};
}
function convertResponseContentToChatGenerationChunk(response, extra) {
	if (!response.candidates || response.candidates.length === 0) return null;
	const [candidate] = response.candidates;
	const { content: candidateContent, ...generationInfo } = candidate;
	const functionCalls = candidateContent.parts?.reduce((acc, p) => {
		if ("functionCall" in p && p.functionCall) acc.push({
			...p,
			id: "id" in p.functionCall && typeof p.functionCall.id === "string" ? p.functionCall.id : v4()
		});
		return acc;
	}, []);
	let content;
	const streamParts = candidateContent?.parts;
	if (Array.isArray(streamParts) && streamParts.every((p) => "text" in p && !p.thought)) content = streamParts.map((p) => p.text).join("");
	else if (Array.isArray(streamParts)) content = streamParts.map((p) => {
		if (p.thought && "text" in p && p.text) return {
			type: "thinking",
			thinking: p.text,
			...p.thoughtSignature ? { signature: p.thoughtSignature } : {}
		};
		else if ("text" in p) return {
			type: "text",
			text: p.text
		};
		else if ("inlineData" in p) return {
			type: "inlineData",
			inlineData: p.inlineData
		};
		else if ("functionCall" in p) return {
			type: "functionCall",
			functionCall: p.functionCall
		};
		else if ("functionResponse" in p) return {
			type: "functionResponse",
			functionResponse: p.functionResponse
		};
		else if ("fileData" in p) return {
			type: "fileData",
			fileData: p.fileData
		};
		else if ("executableCode" in p) return {
			type: "executableCode",
			executableCode: p.executableCode
		};
		else if ("codeExecutionResult" in p) return {
			type: "codeExecutionResult",
			codeExecutionResult: p.codeExecutionResult
		};
		return p;
	});
	else content = [];
	let text = "";
	if (content && typeof content === "string") text = content;
	else if (Array.isArray(content)) text = content.find((b) => "text" in b)?.text ?? "";
	const toolCallChunks = [];
	if (functionCalls) toolCallChunks.push(...functionCalls.map((fc) => ({
		type: "tool_call_chunk",
		id: fc.id,
		name: fc.functionCall.name,
		args: JSON.stringify(fc.functionCall.args)
	})));
	const functionThoughtSignatures = functionCalls?.reduce((acc, fc) => {
		if ("thoughtSignature" in fc && typeof fc.thoughtSignature === "string") acc[fc.id] = fc.thoughtSignature;
		return acc;
	}, {});
	return new ChatGenerationChunk({
		text,
		message: new AIMessageChunk({
			content: content || "",
			name: !candidateContent ? void 0 : candidateContent.role,
			tool_call_chunks: toolCallChunks,
			additional_kwargs: { [_FUNCTION_CALL_THOUGHT_SIGNATURES_MAP_KEY]: functionThoughtSignatures },
			response_metadata: { model_provider: "google-genai" },
			usage_metadata: extra.usageMetadata
		}),
		generationInfo
	});
}
function convertToGenerativeAITools(tools) {
	if (tools.every((tool) => "functionDeclarations" in tool && Array.isArray(tool.functionDeclarations))) return tools;
	return [{ functionDeclarations: tools.map((tool) => {
		if (isLangChainTool(tool)) {
			const jsonSchema = schemaToGenerativeAIParameters(tool.schema);
			if (jsonSchema.type === "object" && "properties" in jsonSchema && Object.keys(jsonSchema.properties).length === 0) return {
				name: tool.name,
				description: tool.description
			};
			assertNoEmptyStringEnums(jsonSchema, tool.name);
			return {
				name: tool.name,
				description: tool.description,
				parameters: jsonSchema
			};
		}
		if (isOpenAITool(tool)) {
			const params = jsonSchemaToGeminiParameters(tool.function.parameters);
			assertNoEmptyStringEnums(params, tool.function.name);
			return {
				name: tool.function.name,
				description: tool.function.description ?? `A function available to call.`,
				parameters: params
			};
		}
		return tool;
	}) }];
}
function convertUsageMetadata(usageMetadata, model) {
	const output = {
		input_tokens: usageMetadata?.promptTokenCount ?? 0,
		output_tokens: usageMetadata?.candidatesTokenCount ?? 0,
		total_tokens: usageMetadata?.totalTokenCount ?? 0
	};
	if (usageMetadata?.cachedContentTokenCount) {
		output.input_token_details ??= {};
		output.input_token_details.cache_read = usageMetadata.cachedContentTokenCount;
	}
	if (model === "gemini-3-pro-preview") {
		const over200k = Math.max(0, usageMetadata?.promptTokenCount ?? -2e5);
		const cachedOver200k = Math.max(0, usageMetadata?.cachedContentTokenCount ?? -2e5);
		if (over200k) output.input_token_details = {
			...output.input_token_details,
			over_200k: over200k
		};
		if (cachedOver200k) output.input_token_details = {
			...output.input_token_details,
			cache_read_over_200k: cachedOver200k
		};
	}
	return output;
}

//#endregion
export { convertBaseMessagesToContent, convertResponseContentToChatGenerationChunk, convertToGenerativeAITools, convertUsageMetadata, mapGenerateContentResultToChatResult };
//# sourceMappingURL=common.js.map