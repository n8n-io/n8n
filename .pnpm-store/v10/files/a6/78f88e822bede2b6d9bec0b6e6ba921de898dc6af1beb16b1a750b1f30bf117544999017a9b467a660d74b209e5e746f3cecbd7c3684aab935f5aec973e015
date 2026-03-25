import { wrapOpenAIClientError } from "../utils/client.js";
import { convertCompletionsCustomTool, formatToOpenAIToolChoice, isBuiltInTool, isBuiltInToolChoice, isCustomTool, isOpenAICustomTool } from "../utils/tools.js";
import { BaseChatOpenAI } from "./base.js";
import { convertMessagesToResponsesInput, convertResponsesDeltaToChatGenerationChunk, convertResponsesMessageToAIMessage } from "../converters/responses.js";
import { isOpenAITool } from "@langchain/core/language_models/base";

//#region src/chat_models/responses.ts
/**
* OpenAI Responses API implementation.
*
* Will be exported in a later version of @langchain/openai.
*
* @internal
*/
var ChatOpenAIResponses = class extends BaseChatOpenAI {
	invocationParams(options) {
		let strict;
		if (options?.strict !== void 0) strict = options.strict;
		else if (this.supportsStrictToolCalling !== void 0) strict = this.supportsStrictToolCalling;
		const params = {
			model: this.model,
			temperature: this.temperature,
			top_p: this.topP,
			user: this.user,
			stream: this.streaming,
			previous_response_id: options?.previous_response_id,
			truncation: options?.truncation,
			include: options?.include,
			tools: options?.tools?.length ? this._reduceChatOpenAITools(options.tools, {
				stream: this.streaming,
				strict
			}) : void 0,
			tool_choice: isBuiltInToolChoice(options?.tool_choice) ? options?.tool_choice : (() => {
				const formatted = formatToOpenAIToolChoice(options?.tool_choice);
				if (typeof formatted === "object" && "type" in formatted) {
					if (formatted.type === "function") return {
						type: "function",
						name: formatted.function.name
					};
					else if (formatted.type === "allowed_tools") return {
						type: "allowed_tools",
						mode: formatted.allowed_tools.mode,
						tools: formatted.allowed_tools.tools
					};
					else if (formatted.type === "custom") return {
						type: "custom",
						name: formatted.custom.name
					};
				}
				return void 0;
			})(),
			text: (() => {
				if (options?.text) return options.text;
				const format = this._getResponseFormat(options?.response_format);
				if (format?.type === "json_schema") {
					if (format.json_schema.schema != null) return {
						format: {
							type: "json_schema",
							schema: format.json_schema.schema,
							description: format.json_schema.description,
							name: format.json_schema.name,
							strict: format.json_schema.strict
						},
						verbosity: options?.verbosity
					};
					return void 0;
				}
				return {
					format,
					verbosity: options?.verbosity
				};
			})(),
			parallel_tool_calls: options?.parallel_tool_calls,
			max_output_tokens: this.maxTokens === -1 ? void 0 : this.maxTokens,
			prompt_cache_key: options?.promptCacheKey ?? this.promptCacheKey,
			...this.zdrEnabled ? { store: false } : {},
			...this.modelKwargs
		};
		const reasoning = this._getReasoningParams(options);
		if (reasoning !== void 0) params.reasoning = reasoning;
		return params;
	}
	async _generate(messages, options) {
		const invocationParams = this.invocationParams(options);
		if (invocationParams.stream) {
			const stream = this._streamResponseChunks(messages, options);
			let finalChunk;
			for await (const chunk of stream) {
				chunk.message.response_metadata = {
					...chunk.generationInfo,
					...chunk.message.response_metadata
				};
				finalChunk = finalChunk?.concat(chunk) ?? chunk;
			}
			return {
				generations: finalChunk ? [finalChunk] : [],
				llmOutput: { estimatedTokenUsage: (finalChunk?.message)?.usage_metadata }
			};
		} else {
			const data = await this.completionWithRetry({
				input: convertMessagesToResponsesInput({
					messages,
					zdrEnabled: this.zdrEnabled ?? false,
					model: this.model
				}),
				...invocationParams,
				stream: false
			}, {
				signal: options?.signal,
				...options?.options
			});
			return {
				generations: [{
					text: data.output_text,
					message: convertResponsesMessageToAIMessage(data)
				}],
				llmOutput: {
					id: data.id,
					estimatedTokenUsage: data.usage ? {
						promptTokens: data.usage.input_tokens,
						completionTokens: data.usage.output_tokens,
						totalTokens: data.usage.total_tokens
					} : void 0
				}
			};
		}
	}
	async *_streamResponseChunks(messages, options, runManager) {
		const streamIterable = await this.completionWithRetry({
			...this.invocationParams(options),
			input: convertMessagesToResponsesInput({
				messages,
				zdrEnabled: this.zdrEnabled ?? false,
				model: this.model
			}),
			stream: true
		}, options);
		for await (const data of streamIterable) {
			const chunk = convertResponsesDeltaToChatGenerationChunk(data);
			if (chunk == null) continue;
			yield chunk;
			await runManager?.handleLLMNewToken(chunk.text || "", {
				prompt: options.promptIndex ?? 0,
				completion: 0
			}, void 0, void 0, void 0, { chunk });
		}
	}
	async completionWithRetry(request, requestOptions) {
		return this.caller.call(async () => {
			const clientOptions = this._getClientOptions(requestOptions);
			try {
				if (request.text?.format?.type === "json_schema" && !request.stream) return await this.client.responses.parse(request, clientOptions);
				return await this.client.responses.create(request, clientOptions);
			} catch (e) {
				const error = wrapOpenAIClientError(e);
				throw error;
			}
		});
	}
	/** @internal */
	_reduceChatOpenAITools(tools, fields) {
		const reducedTools = [];
		for (const tool of tools) if (isBuiltInTool(tool)) {
			if (tool.type === "image_generation" && fields?.stream) tool.partial_images = 1;
			reducedTools.push(tool);
		} else if (isCustomTool(tool)) {
			const customToolData = tool.metadata.customTool;
			reducedTools.push({
				type: "custom",
				name: customToolData.name,
				description: customToolData.description,
				format: customToolData.format
			});
		} else if (isOpenAITool(tool)) reducedTools.push({
			type: "function",
			name: tool.function.name,
			parameters: tool.function.parameters,
			description: tool.function.description,
			strict: fields?.strict ?? null
		});
		else if (isOpenAICustomTool(tool)) reducedTools.push(convertCompletionsCustomTool(tool));
		return reducedTools;
	}
};

//#endregion
export { ChatOpenAIResponses };
//# sourceMappingURL=responses.js.map