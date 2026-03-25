import { GeminiSearchToolAttributes } from "../types.js";
import { GoogleAISafetyError } from "./safety.js";
import { schemaToGeminiParameters } from "./zod_to_gemini_parameters.js";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import { AIMessage, AIMessageChunk, HumanMessage, SystemMessage, ToolMessage, convertToProviderContentBlock, isAIMessage, isDataContentBlock, parseBase64DataUrl } from "@langchain/core/messages";
import { concat } from "@langchain/core/utils/stream";
import { isLangChainTool } from "@langchain/core/utils/function_calling";
import { v4 } from "uuid";

//#region src/utils/gemini.ts
var DefaultGeminiSafetyHandler = class {
	errorFinish = [
		"SAFETY",
		"RECITATION",
		"OTHER"
	];
	constructor(settings) {
		this.errorFinish = settings?.errorFinish ?? this.errorFinish;
	}
	handleDataPromptFeedback(response, data) {
		const blockReason = (data?.promptFeedback)?.blockReason;
		if (blockReason) throw new GoogleAISafetyError(response, `Prompt blocked: ${blockReason}`);
		return data;
	}
	handleDataFinishReason(response, data) {
		const finishReason = (data?.candidates?.[0])?.finishReason;
		if (this.errorFinish.includes(finishReason)) throw new GoogleAISafetyError(response, `Finish reason: ${finishReason}`);
		return data;
	}
	handleData(response, data) {
		let ret = data;
		ret = this.handleDataPromptFeedback(response, ret);
		ret = this.handleDataFinishReason(response, ret);
		return ret;
	}
	handle(response) {
		let newdata;
		if ("nextChunk" in response.data) newdata = response.data;
		else if (Array.isArray(response.data)) try {
			newdata = response.data.map((item) => this.handleData(response, item));
		} catch (xx) {
			if (xx instanceof GoogleAISafetyError) throw new GoogleAISafetyError(response, xx.message);
			else throw xx;
		}
		else {
			const data = response.data;
			newdata = this.handleData(response, data);
		}
		return {
			...response,
			data: newdata
		};
	}
};
var MessageGeminiSafetyHandler = class extends DefaultGeminiSafetyHandler {
	msg = "";
	forceNewMessage = false;
	constructor(settings) {
		super(settings);
		this.msg = settings?.msg ?? this.msg;
		this.forceNewMessage = settings?.forceNewMessage ?? this.forceNewMessage;
	}
	setMessage(data) {
		const ret = data;
		if (this.forceNewMessage || !data?.candidates?.[0]?.content?.parts?.length) {
			ret.candidates = data.candidates ?? [];
			ret.candidates[0] = data.candidates[0] ?? {};
			ret.candidates[0].content = data.candidates[0].content ?? {};
			ret.candidates[0].content = {
				role: "model",
				parts: [{ text: this.msg }]
			};
		}
		return ret;
	}
	handleData(response, data) {
		try {
			return super.handleData(response, data);
		} catch {
			return this.setMessage(data);
		}
	}
};
const extractMimeType = (str) => {
	if (str.startsWith("data:")) return {
		mimeType: str.split(":")[1].split(";")[0],
		data: str.split(",")[1]
	};
	return null;
};
/**
* Infers the MIME type from a URL based on its file extension.
* This is used as a fallback when the MIME type is not provided.
*
* @param url - The URL to infer the MIME type from
* @returns The inferred MIME type or undefined if it cannot be determined
*/
function inferMimeTypeFromUrl(url) {
	const mimeTypeMap = {
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		gif: "image/gif",
		webp: "image/webp",
		bmp: "image/bmp",
		svg: "image/svg+xml",
		ico: "image/x-icon",
		tiff: "image/tiff",
		tif: "image/tiff"
	};
	try {
		const extension = new URL(url).pathname.split(".").pop()?.toLowerCase().split(/[?#]/)[0];
		return extension ? mimeTypeMap[extension] : void 0;
	} catch {
		const match = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
		if (match) return mimeTypeMap[match[1].toLowerCase()];
		return;
	}
}
function normalizeSpeechConfig(config) {
	function isSpeechConfig(config) {
		return typeof config === "object" && (Object.hasOwn(config, "voiceConfig") || Object.hasOwn(config, "multiSpeakerVoiceConfig"));
	}
	function hasLanguage(config) {
		return typeof config === "object" && Object.hasOwn(config, "languageCode");
	}
	function hasVoice(config) {
		return Object.hasOwn(config, "voice");
	}
	if (typeof config === "undefined") return;
	if (isSpeechConfig(config)) return config;
	let languageCode;
	let voice;
	if (hasLanguage(config)) {
		languageCode = config.languageCode;
		voice = hasVoice(config) ? config.voice : config.voices;
	} else {
		languageCode = void 0;
		voice = config;
	}
	let ret;
	if (typeof voice === "string") ret = { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } };
	else ret = { multiSpeakerVoiceConfig: { speakerVoiceConfigs: (Array.isArray(voice) ? voice : [voice]).map((v) => ({
		speaker: v.speaker,
		voiceConfig: { prebuiltVoiceConfig: { voiceName: v.name } }
	})) } };
	if (languageCode) ret.languageCode = languageCode;
	return ret;
}
function getGeminiAPI(config) {
	function messageContentText(content) {
		if (content?.text && content?.text.length > 0) return { text: content.text };
		else return null;
	}
	function messageContentImageUrlData(content) {
		const url = typeof content.image_url === "string" ? content.image_url : content.image_url.url;
		if (!url) throw new Error("Missing Image URL");
		const mimeTypeAndData = extractMimeType(url);
		if (mimeTypeAndData) return { inlineData: mimeTypeAndData };
		else return { fileData: {
			mimeType: inferMimeTypeFromUrl(url) || "image/png",
			fileUri: url
		} };
	}
	function messageContentImageUrl(content) {
		const ret = messageContentImageUrlData(content);
		supplementVideoMetadata(content, ret);
		return ret;
	}
	async function blobToFileData(blob) {
		return { fileData: {
			fileUri: blob.path,
			mimeType: blob.mimetype
		} };
	}
	async function fileUriContentToBlob(uri) {
		return config?.mediaManager?.getMediaBlob(uri);
	}
	async function messageContentMediaData(content) {
		if ("mimeType" in content && "data" in content) return { inlineData: {
			mimeType: content.mimeType,
			data: content.data
		} };
		else if ("mimeType" in content && "fileUri" in content) return { fileData: {
			mimeType: content.mimeType,
			fileUri: content.fileUri
		} };
		else {
			const uri = content.fileUri;
			const blob = await fileUriContentToBlob(uri);
			if (blob) return await blobToFileData(blob);
		}
		throw new Error(`Invalid media content: ${JSON.stringify(content, null, 1)}`);
	}
	function supplementVideoMetadata(content, ret) {
		if ("videoMetadata" in content && typeof ret === "object") ret.videoMetadata = content.videoMetadata;
		return ret;
	}
	async function messageContentMedia(content) {
		const ret = await messageContentMediaData(content);
		supplementVideoMetadata(content, ret);
		return ret;
	}
	function messageContentReasoning(content) {
		if (content?.reasoning && content?.reasoning.length > 0) return {
			text: content.reasoning,
			thought: true
		};
		else return null;
	}
	const standardContentBlockConverter = {
		providerName: "Google Gemini",
		fromStandardTextBlock(block) {
			return { text: block.text };
		},
		fromStandardImageBlock(block) {
			if (block.source_type === "url") {
				const data = parseBase64DataUrl({ dataUrl: block.url });
				if (data) return { inlineData: {
					mimeType: data.mime_type,
					data: data.data
				} };
				else {
					let mimeType = block.mime_type;
					if (!mimeType || mimeType === "") mimeType = inferMimeTypeFromUrl(block.url) || "image/png";
					return { fileData: {
						mimeType,
						fileUri: block.url
					} };
				}
			}
			if (block.source_type === "base64") return { inlineData: {
				mimeType: block.mime_type || "image/png",
				data: block.data
			} };
			throw new Error(`Unsupported source type: ${block.source_type}`);
		},
		fromStandardAudioBlock(block) {
			if (block.source_type === "url") {
				const data = parseBase64DataUrl({ dataUrl: block.url });
				if (data) return { inlineData: {
					mimeType: data.mime_type,
					data: data.data
				} };
				else return { fileData: {
					mimeType: block.mime_type || "audio/mpeg",
					fileUri: block.url
				} };
			}
			if (block.source_type === "base64") return { inlineData: {
				mimeType: block.mime_type || "audio/mpeg",
				data: block.data
			} };
			throw new Error(`Unsupported source type: ${block.source_type}`);
		},
		fromStandardFileBlock(block) {
			if (block.source_type === "text") return { text: block.text };
			if (block.source_type === "url") {
				const data = parseBase64DataUrl({ dataUrl: block.url });
				if (data) return { inlineData: {
					mimeType: data.mime_type,
					data: data.data
				} };
				else return { fileData: {
					mimeType: block.mime_type || "application/octet-stream",
					fileUri: block.url
				} };
			}
			if (block.source_type === "base64") return { inlineData: {
				mimeType: block.mime_type || "application/octet-stream",
				data: block.data
			} };
			throw new Error(`Unsupported source type: ${block.source_type}`);
		}
	};
	async function messageContentComplexToPart(content) {
		switch (content.type) {
			case "text":
				if ("text" in content) return messageContentText(content);
				break;
			case "image_url":
				if ("image_url" in content) return messageContentImageUrl(content);
				break;
			case "media": return await messageContentMedia(content);
			case "reasoning": return messageContentReasoning(content);
			case "input_audio":
				if ("input_audio" in content) return { inlineData: {
					mimeType: `audio/${content.input_audio.format}`,
					data: content.input_audio.data
				} };
				break;
			default: throw new Error(`Unsupported type "${content.type}" received while converting message to message parts: ${JSON.stringify(content)}`);
		}
		throw new Error(`Cannot coerce "${content.type}" message part into a string.`);
	}
	async function messageContentComplexToParts(content) {
		const contents = content.map((m) => isDataContentBlock(m) ? convertToProviderContentBlock(m, standardContentBlockConverter) : messageContentComplexToPart(m));
		return Promise.all(contents);
	}
	async function messageContentToParts(content) {
		return (await messageContentComplexToParts(typeof content === "string" ? [{
			type: "text",
			text: content
		}] : content)).reduce((acc, val) => {
			if (val) return [...acc, val];
			else return acc;
		}, []);
	}
	function messageToolCallsToParts(toolCalls) {
		if (!toolCalls || toolCalls.length === 0) return [];
		return toolCalls.map((tool) => {
			let args = {};
			if (tool?.function?.arguments) {
				const argStr = tool.function.arguments;
				args = JSON.parse(argStr);
			}
			return { functionCall: {
				name: tool.function.name,
				args
			} };
		});
	}
	function messageKwargsToParts(kwargs) {
		const ret = [];
		if (kwargs?.tool_calls) ret.push(...messageToolCallsToParts(kwargs.tool_calls));
		return ret;
	}
	async function roleMessageToContent(role, message) {
		const contentParts = await messageContentToParts(message.content);
		let toolParts;
		if (isAIMessage(message) && !!message.tool_calls?.length) toolParts = message.tool_calls.map((toolCall) => ({ functionCall: {
			name: toolCall.name,
			args: toolCall.args
		} }));
		else toolParts = messageKwargsToParts(message.additional_kwargs);
		const parts = [...contentParts, ...toolParts];
		const signatures = message?.additional_kwargs?.signatures ?? [];
		if (signatures.length === parts.length) for (let co = 0; co < signatures.length; co += 1) {
			const signature = signatures[co];
			if (signature && signature.length > 0) parts[co].thoughtSignature = signature;
		}
		return [{
			role,
			parts
		}];
	}
	async function systemMessageToContent(message) {
		return config?.useSystemInstruction ? roleMessageToContent("system", message) : [...await roleMessageToContent("user", message), ...await roleMessageToContent("model", new AIMessage("Ok"))];
	}
	function toolMessageToContent(message, prevMessage) {
		const contentStr = typeof message.content === "string" ? message.content : message.content.reduce((acc, content) => {
			if (content.type === "text") return acc + content.text;
			else return acc;
		}, "");
		const responseName = (isAIMessage(prevMessage) && !!prevMessage.tool_calls?.length ? prevMessage.tool_calls[0].name : prevMessage.name) ?? message.tool_call_id;
		try {
			return [{
				role: "function",
				parts: [{ functionResponse: {
					name: responseName,
					response: { content: JSON.parse(contentStr) }
				} }]
			}];
		} catch (_) {
			return [{
				role: "function",
				parts: [{ functionResponse: {
					name: responseName,
					response: { content: contentStr }
				} }]
			}];
		}
	}
	async function baseMessageToContent(message, prevMessage) {
		if (SystemMessage.isInstance(message)) return systemMessageToContent(message);
		else if (HumanMessage.isInstance(message)) return roleMessageToContent("user", message);
		else if (AIMessage.isInstance(message)) return roleMessageToContent("model", message);
		else if (ToolMessage.isInstance(message)) {
			if (!prevMessage) throw new Error("Tool messages cannot be the first message passed to the model.");
			return toolMessageToContent(message, prevMessage);
		} else {
			console.log(`Unsupported message type: ${message.type}`);
			return [];
		}
	}
	function thoughtPartToMessageContent(part) {
		return {
			type: "reasoning",
			reasoning: part.text
		};
	}
	function textPartToMessageContent(part) {
		return {
			type: "text",
			text: part.text
		};
	}
	function inlineDataPartToMessageContentImage(part) {
		return {
			type: "image_url",
			image_url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
		};
	}
	function inlineDataPartToMessageContentMedia(part) {
		return {
			type: "media",
			mimeType: part.inlineData.mimeType,
			data: part.inlineData.data
		};
	}
	function inlineDataPartToMessageContent(part) {
		if ((part?.inlineData?.mimeType ?? "").startsWith("image")) return inlineDataPartToMessageContentImage(part);
		else return inlineDataPartToMessageContentMedia(part);
	}
	function fileDataPartToMessageContent(part) {
		return {
			type: "image_url",
			image_url: part.fileData.fileUri
		};
	}
	function partsToMessageContent(parts) {
		return parts.map((part) => {
			if (part === void 0 || part === null) return null;
			else if (part.thought) return thoughtPartToMessageContent(part);
			else if ("text" in part) return textPartToMessageContent(part);
			else if ("inlineData" in part) return inlineDataPartToMessageContent(part);
			else if ("fileData" in part) return fileDataPartToMessageContent(part);
			else return null;
		}).reduce((acc, content) => {
			if (content) acc.push(content);
			return acc;
		}, []);
	}
	function toolRawToTool(raw) {
		return {
			id: raw.id,
			type: raw.type,
			function: {
				name: raw.function.name,
				arguments: JSON.stringify(raw.function.arguments)
			}
		};
	}
	function functionCallPartToToolRaw(part) {
		return {
			id: v4().replace(/-/g, ""),
			type: "function",
			function: {
				name: part.functionCall.name,
				arguments: part.functionCall.args ?? {}
			}
		};
	}
	function partsToToolsRaw(parts) {
		return parts.map((part) => {
			if (part === void 0 || part === null) return null;
			else if ("functionCall" in part) return functionCallPartToToolRaw(part);
			else return null;
		}).reduce((acc, content) => {
			if (content) acc.push(content);
			return acc;
		}, []);
	}
	function toolsRawToTools(raws) {
		return raws.map((raw) => toolRawToTool(raw));
	}
	function responseToGenerateContentResponseData(response) {
		if ("nextChunk" in response.data) throw new Error("Cannot convert Stream to GenerateContentResponseData");
		else if (Array.isArray(response.data)) return response.data.reduce((acc, val) => {
			const valParts = val?.candidates?.[0]?.content?.parts ?? [];
			acc.candidates[0].content.parts.push(...valParts);
			acc.promptFeedback = val.promptFeedback;
			return acc;
		});
		else return response.data;
	}
	function responseToParts(response) {
		return responseToGenerateContentResponseData(response)?.candidates?.[0]?.content?.parts ?? [];
	}
	function partToText(part) {
		return "text" in part ? part.text : "";
	}
	function responseToString(response) {
		return responseToParts(response).reduce((acc, part) => {
			return acc + partToText(part);
		}, "");
	}
	function safeResponseTo(response, responseTo) {
		const safetyHandler = config?.safetyHandler ?? new DefaultGeminiSafetyHandler();
		try {
			return responseTo(safetyHandler.handle(response));
		} catch (xx) {
			if (xx instanceof GoogleAISafetyError) xx.reply = responseTo(xx.response);
			throw xx;
		}
	}
	function safeResponseToString(response) {
		return safeResponseTo(response, responseToString);
	}
	function logprobResultToLogprob(result) {
		const token = result?.token;
		const logprob = result?.logProbability;
		const encoder = new TextEncoder();
		return {
			token,
			logprob,
			bytes: Array.from(encoder.encode(token))
		};
	}
	function candidateToLogprobs(candidate) {
		const logprobs = candidate?.logprobsResult;
		const chosenTokens = logprobs?.chosenCandidates ?? [];
		const topTokens = logprobs?.topCandidates ?? [];
		const content = [];
		for (let co = 0; co < chosenTokens.length; co += 1) {
			const chosen = chosenTokens[co];
			const top = topTokens[co]?.candidates ?? [];
			const logprob = logprobResultToLogprob(chosen);
			logprob.top_logprobs = top.map((l) => logprobResultToLogprob(l));
			content.push(logprob);
		}
		return { content };
	}
	function candidateToUrlContextMetadata(candidate) {
		const retrieval = candidate?.urlRetrievalMetadata?.urlRetrievalContexts ?? [];
		const context = candidate?.urlContextMetadata?.urlMetadata ?? [];
		const all = [...retrieval, ...context];
		if (all.length === 0) return;
		else return { urlMetadata: all };
	}
	function addModalityCounts(modalityTokenCounts, details) {
		modalityTokenCounts?.forEach((modalityTokenCount) => {
			const { modality, tokenCount } = modalityTokenCount;
			const modalityLc = modality.toLowerCase();
			details[modalityLc] = (details[modalityLc] ?? 0) + tokenCount;
		});
	}
	function responseToUsageMetadata(response) {
		if ("usageMetadata" in response.data) {
			const usageMetadata = (response?.data)?.usageMetadata;
			const input_tokens = usageMetadata.promptTokenCount ?? 0;
			const output_tokens = (usageMetadata.candidatesTokenCount ?? 0) + (usageMetadata.thoughtsTokenCount ?? 0);
			const total_tokens = usageMetadata.totalTokenCount ?? input_tokens + output_tokens;
			const input_token_details = {};
			addModalityCounts(usageMetadata.promptTokensDetails, input_token_details);
			if (typeof usageMetadata?.cachedContentTokenCount === "number") input_token_details.cache_read = usageMetadata.cachedContentTokenCount;
			const output_token_details = {};
			addModalityCounts(usageMetadata?.candidatesTokensDetails, output_token_details);
			if (typeof usageMetadata?.thoughtsTokenCount === "number") output_token_details.reasoning = usageMetadata.thoughtsTokenCount;
			return {
				input_tokens,
				output_tokens,
				total_tokens,
				input_token_details,
				output_token_details
			};
		}
	}
	function responseToGenerationInfo(response) {
		const data = Array.isArray(response.data) && response.data[0] ? response.data[0] : response.data && response.data.candidates ? response.data : void 0;
		if (!data) return {};
		const finish_reason = data.candidates[0]?.finishReason;
		const ret = {
			safety_ratings: data.candidates[0]?.safetyRatings?.map((rating) => ({
				category: rating.category,
				probability: rating.probability,
				probability_score: rating.probabilityScore,
				severity: rating.severity,
				severity_score: rating.severityScore
			})),
			citation_metadata: data.candidates[0]?.citationMetadata,
			grounding_metadata: data.candidates[0]?.groundingMetadata,
			finish_reason,
			finish_message: data.candidates[0]?.finishMessage,
			url_context_metadata: candidateToUrlContextMetadata(data.candidates[0]),
			avgLogprobs: data.candidates[0]?.avgLogprobs,
			logprobs: candidateToLogprobs(data.candidates[0])
		};
		if (typeof finish_reason === "string") ret.usage_metadata = responseToUsageMetadata(response);
		return ret;
	}
	function responseToChatGeneration(response) {
		return new ChatGenerationChunk({
			text: responseToString(response),
			message: partToMessageChunk(responseToParts(response)[0]),
			generationInfo: responseToGenerationInfo(response)
		});
	}
	function safeResponseToChatGeneration(response) {
		return safeResponseTo(response, responseToChatGeneration);
	}
	function chunkToString(chunk) {
		if (chunk === null) return "";
		else if (typeof chunk.content === "string") return chunk.content;
		else if (chunk.content.length === 0) return "";
		else if (chunk.content[0].type === "text") return chunk.content[0].text;
		else throw new Error(`Unexpected chunk: ${chunk}`);
	}
	function partToMessageChunk(part) {
		const fields = partsToBaseMessageChunkFields([part]);
		if (typeof fields.content === "string") return new AIMessageChunk(fields);
		else if (fields.content?.every((item) => item.type === "text")) {
			const newContent = fields.content.map((item) => "text" in item ? item.text : "").join("");
			return new AIMessageChunk({
				...fields,
				content: newContent,
				response_metadata: {
					...fields.response_metadata,
					model_provider: "google-vertexai"
				}
			});
		}
		return new AIMessageChunk(fields);
	}
	function partToChatGeneration(part) {
		const message = partToMessageChunk(part);
		return new ChatGenerationChunk({
			text: partToText(part),
			message,
			generationInfo: {}
		});
	}
	function groundingSupportByPart(groundingSupports) {
		const ret = [];
		if (!groundingSupports || groundingSupports.length === 0) return [];
		groundingSupports?.forEach((groundingSupport) => {
			const partIndex = (groundingSupport?.segment)?.partIndex ?? 0;
			if (ret[partIndex]) ret[partIndex].push(groundingSupport);
			else ret[partIndex] = [groundingSupport];
		});
		return ret;
	}
	function responseToGroundedChatGenerations(response) {
		const parts = responseToParts(response);
		if (parts.length === 0) return [];
		const candidate = (response?.data)?.candidates?.[0];
		const groundingMetadata = candidate?.groundingMetadata;
		const citationMetadata = candidate?.citationMetadata;
		const groundingParts = groundingSupportByPart(groundingMetadata?.groundingSupports);
		return parts.map((part, index) => {
			const gen = partToChatGeneration(part);
			if (!gen.generationInfo) gen.generationInfo = {};
			if (groundingMetadata) {
				gen.generationInfo.groundingMetadata = groundingMetadata;
				const groundingPart = groundingParts[index];
				if (groundingPart) gen.generationInfo.groundingSupport = groundingPart;
			}
			if (citationMetadata) gen.generationInfo.citationMetadata = citationMetadata;
			return gen;
		});
	}
	function combineContent(gen, forceComplex = false) {
		if (gen.every((item) => typeof item.message.content === "string") && !forceComplex) return gen.map((item) => item.message.content).join("");
		else {
			const ret = [];
			gen.forEach((item) => {
				if (typeof item.message.content === "string") ret.push({
					type: "text",
					text: item.message.content
				});
				else item.message.content.forEach((c) => {
					ret.push(c);
				});
			});
			return ret;
		}
	}
	function combineText(gen) {
		return gen.map((item) => item.text ?? "").join("");
	}
	function combineToolCalls(gen) {
		let ret = new AIMessageChunk("");
		gen.forEach((item) => {
			const message = item?.message;
			ret = concat(ret, message);
		});
		return ret;
	}
	function combineAdditionalKwargs(gen) {
		const ret = {};
		gen.forEach((item) => {
			const kwargs = (item?.message)?.additional_kwargs ?? {};
			Object.keys(kwargs).forEach((key) => {
				const value = kwargs[key];
				if (Object.hasOwn(ret, key) && Array.isArray(ret[key]) && Array.isArray(value)) ret[key].push(...value);
				else ret[key] = value;
			});
		});
		return ret;
	}
	function combineGenerations(generations, response) {
		const gen = splitGenerationTypes(generations, response);
		const combinedContent = combineContent(gen.content);
		const combinedText = combineText(gen.content);
		const combinedToolCalls = combineToolCalls(gen.content);
		const kwargs = combineAdditionalKwargs(gen.content);
		const lastContent = gen.content[gen.content.length - 1];
		return [new ChatGenerationChunk({
			message: new AIMessageChunk({
				content: combinedContent,
				additional_kwargs: kwargs,
				response_metadata: { model_provider: "google-vertexai" },
				usage_metadata: responseToUsageMetadata(response),
				tool_calls: combinedToolCalls.tool_calls,
				invalid_tool_calls: combinedToolCalls.invalid_tool_calls
			}),
			text: combinedText,
			generationInfo: lastContent.generationInfo
		})];
	}
	function splitGenerationTypes(generations, _response) {
		const content = [];
		const reasoning = [];
		generations.forEach((gen) => {
			if (gen?.generationInfo?.thought) reasoning.push(gen);
			else content.push(gen);
		});
		return {
			content,
			reasoning
		};
	}
	/**
	* Although this returns an array, only the first (or maybe last)
	* element in the array is used. So we need to combine them into
	* just one element that contains everything we need.
	* @param response
	*/
	function responseToChatGenerations(response) {
		const generations = responseToGroundedChatGenerations(response);
		if (generations.length === 0) return [];
		const ret = combineGenerations(generations, response);
		const candidate = (response?.data)?.candidates?.[0];
		const avgLogprobs = candidate?.avgLogprobs;
		const logprobs = candidateToLogprobs(candidate);
		if (logprobs) ret[0].message.response_metadata = {
			model_provider: "google-vertexai",
			...ret[0].message.response_metadata,
			logprobs,
			avgLogprobs
		};
		return ret;
	}
	function responseToBaseMessageFields(response) {
		return partsToBaseMessageChunkFields(responseToParts(response));
	}
	function partsToSignatures(parts) {
		return parts.map((part) => part?.thoughtSignature ?? "");
	}
	function partsToBaseMessageChunkFields(parts) {
		const fields = {
			content: partsToMessageContent(parts),
			tool_call_chunks: [],
			tool_calls: [],
			invalid_tool_calls: [],
			response_metadata: { model_provider: "google-vertexai" }
		};
		fields.additional_kwargs = {};
		const rawTools = partsToToolsRaw(parts);
		if (rawTools.length > 0) {
			const tools = toolsRawToTools(rawTools);
			for (const tool of tools) {
				fields.tool_call_chunks?.push({
					name: tool.function.name,
					args: tool.function.arguments,
					id: tool.id,
					type: "tool_call_chunk"
				});
				try {
					fields.tool_calls?.push({
						name: tool.function.name,
						args: JSON.parse(tool.function.arguments),
						id: tool.id
					});
				} catch (e) {
					fields.invalid_tool_calls?.push({
						name: tool.function.name,
						args: tool.function.arguments,
						id: tool.id,
						error: e.message,
						type: "invalid_tool_call"
					});
				}
			}
			fields.additional_kwargs.tool_calls = tools;
		}
		fields.additional_kwargs.signatures = partsToSignatures(parts);
		return fields;
	}
	function responseToBaseMessage(response) {
		return new AIMessage(responseToBaseMessageFields(response));
	}
	function safeResponseToBaseMessage(response) {
		return safeResponseTo(response, responseToBaseMessage);
	}
	function responseToChatResult(response) {
		return {
			generations: responseToChatGenerations(response),
			llmOutput: responseToGenerationInfo(response)
		};
	}
	function safeResponseToChatResult(response) {
		return safeResponseTo(response, responseToChatResult);
	}
	function inputType(input) {
		if (typeof input === "string") return "MessageContent";
		else {
			const firstItem = input[0];
			if (Object.hasOwn(firstItem, "content")) return "BaseMessageArray";
			else return "MessageContent";
		}
	}
	async function formatMessageContents(input, _parameters) {
		return [{
			role: "user",
			parts: await messageContentToParts(input)
		}];
	}
	async function formatBaseMessageContents(input, _parameters) {
		const inputPromises = input.map((msg, i) => baseMessageToContent(msg, input[i - 1]));
		return (await Promise.all(inputPromises)).reduce((acc, cur) => {
			if (cur.every((content) => content.role === "system")) return acc;
			if (cur[0]?.role === "function" && acc.length > 0 && acc[acc.length - 1].role === "function") acc[acc.length - 1].parts = [...acc[acc.length - 1].parts, ...cur[0].parts];
			else acc.push(...cur);
			return acc;
		}, []);
	}
	async function formatContents(input, parameters) {
		const it = inputType(input);
		switch (it) {
			case "MessageContent": return formatMessageContents(input, parameters);
			case "BaseMessageArray": return formatBaseMessageContents(input, parameters);
			default: throw new Error(`Unknown input type "${it}": ${input}`);
		}
	}
	function formatGenerationConfig(parameters) {
		const ret = {
			temperature: parameters.temperature,
			topK: parameters.topK,
			topP: parameters.topP,
			seed: parameters.seed,
			presencePenalty: parameters.presencePenalty,
			frequencyPenalty: parameters.frequencyPenalty,
			maxOutputTokens: parameters.maxOutputTokens,
			stopSequences: parameters.stopSequences,
			responseMimeType: parameters.responseSchema ? "application/json" : parameters.responseMimeType,
			responseSchema: parameters.responseSchema,
			responseModalities: parameters.responseModalities,
			speechConfig: normalizeSpeechConfig(parameters.speechConfig)
		};
		if (typeof parameters.logprobs !== "undefined") {
			ret.responseLogprobs = parameters.logprobs;
			if (parameters.logprobs && typeof parameters.topLogprobs !== "undefined") ret.logprobs = parameters.topLogprobs;
		}
		if (typeof parameters.maxReasoningTokens !== "undefined" || typeof parameters.thinkingLevel !== "undefined" || typeof parameters.reasoningLevel !== "undefined") {
			ret.thinkingConfig = {};
			if (typeof parameters.maxReasoningTokens !== "undefined") {
				const includeThoughts = parameters.maxReasoningTokens !== 0;
				ret.thinkingConfig.thinkingBudget = parameters.maxReasoningTokens;
				ret.thinkingConfig.includeThoughts = includeThoughts;
			}
			if (typeof parameters.reasoningLevel !== "undefined") {
				const levelMap = {
					low: "LOW",
					medium: "MEDIUM",
					high: "HIGH"
				};
				ret.thinkingConfig.thinkingLevel = levelMap[parameters.reasoningLevel];
			}
			if (typeof parameters.thinkingLevel !== "undefined") ret.thinkingConfig.thinkingLevel = parameters.thinkingLevel;
		}
		let attribute;
		for (attribute in ret) if (ret[attribute] === void 0) delete ret[attribute];
		return ret;
	}
	function formatSafetySettings(parameters) {
		return parameters.safetySettings ?? [];
	}
	async function formatBaseMessageSystemInstruction(input) {
		let ret = {};
		for (let index = 0; index < input.length; index += 1) {
			const message = input[index];
			if (message.getType() === "system") if (index === 0) ret = (await baseMessageToContent(message, void 0))[0];
			else throw new Error("System messages are only permitted as the first passed message.");
		}
		return ret;
	}
	async function formatSystemInstruction(input) {
		if (!config?.useSystemInstruction) return {};
		switch (inputType(input)) {
			case "BaseMessageArray": return formatBaseMessageSystemInstruction(input);
			default: return {};
		}
	}
	function structuredToolToFunctionDeclaration(tool) {
		const jsonSchema = schemaToGeminiParameters(tool.schema);
		return {
			name: tool.name,
			description: tool.description ?? `A function available to call.`,
			parameters: jsonSchema
		};
	}
	function searchToolName(tool) {
		for (const name of GeminiSearchToolAttributes) if (name in tool) return name;
	}
	function cleanGeminiTool(tool) {
		const orig = searchToolName(tool);
		const adj = config?.googleSearchToolAdjustment;
		if (orig && adj && adj !== orig) return { [adj]: {} };
		else return tool;
	}
	function formatTools(parameters) {
		const tools = parameters?.tools;
		if (!tools || tools.length === 0) return [];
		const langChainTools = [];
		const otherTools = [];
		tools.forEach((tool) => {
			if (isLangChainTool(tool)) langChainTools.push(tool);
			else otherTools.push(cleanGeminiTool(tool));
		});
		const result = [...otherTools];
		if (langChainTools.length > 0) result.push({ functionDeclarations: langChainTools.map(structuredToolToFunctionDeclaration) });
		return result;
	}
	function formatToolConfig(parameters) {
		if (!parameters.tool_choice || typeof parameters.tool_choice !== "string") return;
		if ([
			"auto",
			"any",
			"none"
		].includes(parameters.tool_choice)) return { functionCallingConfig: {
			mode: parameters.tool_choice,
			allowedFunctionNames: parameters.allowed_function_names
		} };
		return { functionCallingConfig: {
			mode: "any",
			allowedFunctionNames: [parameters.tool_choice]
		} };
	}
	async function formatData(input, parameters) {
		const typedInput = input;
		const contents = await formatContents(typedInput, parameters);
		const generationConfig = formatGenerationConfig(parameters);
		const tools = formatTools(parameters);
		const toolConfig = formatToolConfig(parameters);
		const safetySettings = formatSafetySettings(parameters);
		const systemInstruction = await formatSystemInstruction(typedInput);
		const ret = {
			contents,
			generationConfig
		};
		if (tools && tools.length) ret.tools = tools;
		if (toolConfig) ret.toolConfig = toolConfig;
		if (safetySettings && safetySettings.length) ret.safetySettings = safetySettings;
		if (systemInstruction?.role && systemInstruction?.parts && systemInstruction?.parts?.length) ret.systemInstruction = systemInstruction;
		if (parameters.cachedContent) ret.cachedContent = parameters.cachedContent;
		if (parameters.labels && Object.keys(parameters.labels).length > 0) ret.labels = parameters.labels;
		return ret;
	}
	return {
		messageContentToParts,
		baseMessageToContent,
		responseToString: safeResponseToString,
		responseToChatGeneration: safeResponseToChatGeneration,
		chunkToString,
		responseToBaseMessage: safeResponseToBaseMessage,
		responseToChatResult: safeResponseToChatResult,
		formatData
	};
}
function validateGeminiParams(params) {
	if (params.maxOutputTokens && params.maxOutputTokens < 0) throw new Error("`maxOutputTokens` must be a positive integer");
	if (typeof params.maxReasoningTokens !== "undefined") {
		if (typeof params.maxOutputTokens !== "undefined") {
			if (params.maxReasoningTokens >= params.maxOutputTokens) throw new Error("`maxOutputTokens` must be greater than `maxReasoningTokens`");
		}
	}
	if (params.temperature && (params.temperature < 0 || params.temperature > 2)) throw new Error("`temperature` must be in the range of [0.0,2.0]");
	if (params.topP && (params.topP < 0 || params.topP > 1)) throw new Error("`topP` must be in the range of [0.0,1.0]");
	if (params.topK && params.topK < 0) throw new Error("`topK` must be a positive integer");
}
function isModelGemini(modelName) {
	return modelName.toLowerCase().startsWith("gemini");
}
function isModelGemma(modelName) {
	return modelName.toLowerCase().startsWith("gemma");
}

//#endregion
export { DefaultGeminiSafetyHandler, MessageGeminiSafetyHandler, getGeminiAPI, isModelGemini, isModelGemma, normalizeSpeechConfig, validateGeminiParams };
//# sourceMappingURL=gemini.js.map