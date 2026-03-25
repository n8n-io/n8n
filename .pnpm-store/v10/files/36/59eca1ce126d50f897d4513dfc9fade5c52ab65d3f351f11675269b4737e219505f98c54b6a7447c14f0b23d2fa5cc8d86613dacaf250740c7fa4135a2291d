import { wrapOpenAIClientError } from "../utils/client.js";
import { formatToOpenAIToolChoice } from "../utils/tools.js";
import { isReasoningModel } from "../utils/misc.js";
import { BaseChatOpenAI } from "./base.js";
import { convertCompletionsDeltaToBaseMessageChunk, convertCompletionsMessageToBaseMessage, convertMessagesToCompletionsMessageParams } from "../converters/completions.js";
import { AIMessage, AIMessageChunk, isAIMessage } from "@langchain/core/messages";
import { ChatGenerationChunk } from "@langchain/core/outputs";

//#region src/chat_models/completions.ts
/**
* OpenAI Completions API implementation.
* @internal
*/
var ChatOpenAICompletions = class extends BaseChatOpenAI {
	/** @internal */
	invocationParams(options, extra) {
		let strict;
		if (options?.strict !== void 0) strict = options.strict;
		else if (this.supportsStrictToolCalling !== void 0) strict = this.supportsStrictToolCalling;
		let streamOptionsConfig = {};
		if (options?.stream_options !== void 0) streamOptionsConfig = { stream_options: options.stream_options };
		else if (this.streamUsage && (this.streaming || extra?.streaming)) streamOptionsConfig = { stream_options: { include_usage: true } };
		const params = {
			model: this.model,
			temperature: this.temperature,
			top_p: this.topP,
			frequency_penalty: this.frequencyPenalty,
			presence_penalty: this.presencePenalty,
			logprobs: this.logprobs,
			top_logprobs: this.topLogprobs,
			n: this.n,
			logit_bias: this.logitBias,
			stop: options?.stop ?? this.stopSequences,
			user: this.user,
			stream: this.streaming,
			functions: options?.functions,
			function_call: options?.function_call,
			tools: options?.tools?.length ? options.tools.map((tool) => this._convertChatOpenAIToolToCompletionsTool(tool, { strict })) : void 0,
			tool_choice: formatToOpenAIToolChoice(options?.tool_choice),
			response_format: this._getResponseFormat(options?.response_format),
			seed: options?.seed,
			...streamOptionsConfig,
			parallel_tool_calls: options?.parallel_tool_calls,
			...this.audio || options?.audio ? { audio: this.audio || options?.audio } : {},
			...this.modalities || options?.modalities ? { modalities: this.modalities || options?.modalities } : {},
			...this.modelKwargs,
			prompt_cache_key: options?.promptCacheKey ?? this.promptCacheKey,
			verbosity: options?.verbosity ?? this.verbosity
		};
		if (options?.prediction !== void 0) params.prediction = options.prediction;
		if (this.service_tier !== void 0) params.service_tier = this.service_tier;
		if (options?.service_tier !== void 0) params.service_tier = options.service_tier;
		const reasoning = this._getReasoningParams(options);
		if (reasoning !== void 0 && reasoning.effort !== void 0) params.reasoning_effort = reasoning.effort;
		if (isReasoningModel(params.model)) params.max_completion_tokens = this.maxTokens === -1 ? void 0 : this.maxTokens;
		else params.max_tokens = this.maxTokens === -1 ? void 0 : this.maxTokens;
		return params;
	}
	async _generate(messages, options, runManager) {
		const usageMetadata = {};
		const params = this.invocationParams(options);
		const messagesMapped = convertMessagesToCompletionsMessageParams({
			messages,
			model: this.model
		});
		if (params.stream) {
			const stream = this._streamResponseChunks(messages, options, runManager);
			const finalChunks = {};
			for await (const chunk of stream) {
				chunk.message.response_metadata = {
					...chunk.generationInfo,
					...chunk.message.response_metadata
				};
				const index = chunk.generationInfo?.completion ?? 0;
				if (finalChunks[index] === void 0) finalChunks[index] = chunk;
				else finalChunks[index] = finalChunks[index].concat(chunk);
			}
			const generations = Object.entries(finalChunks).sort(([aKey], [bKey]) => parseInt(aKey, 10) - parseInt(bKey, 10)).map(([_, value]) => value);
			const { functions, function_call } = this.invocationParams(options);
			const promptTokenUsage = await this._getEstimatedTokenCountFromPrompt(messages, functions, function_call);
			const completionTokenUsage = await this._getNumTokensFromGenerations(generations);
			usageMetadata.input_tokens = promptTokenUsage;
			usageMetadata.output_tokens = completionTokenUsage;
			usageMetadata.total_tokens = promptTokenUsage + completionTokenUsage;
			return {
				generations,
				llmOutput: { estimatedTokenUsage: {
					promptTokens: usageMetadata.input_tokens,
					completionTokens: usageMetadata.output_tokens,
					totalTokens: usageMetadata.total_tokens
				} }
			};
		} else {
			const data = await this.completionWithRetry({
				...params,
				stream: false,
				messages: messagesMapped
			}, {
				signal: options?.signal,
				...options?.options
			});
			const { completion_tokens: completionTokens, prompt_tokens: promptTokens, total_tokens: totalTokens, prompt_tokens_details: promptTokensDetails, completion_tokens_details: completionTokensDetails } = data?.usage ?? {};
			if (completionTokens) usageMetadata.output_tokens = (usageMetadata.output_tokens ?? 0) + completionTokens;
			if (promptTokens) usageMetadata.input_tokens = (usageMetadata.input_tokens ?? 0) + promptTokens;
			if (totalTokens) usageMetadata.total_tokens = (usageMetadata.total_tokens ?? 0) + totalTokens;
			if (promptTokensDetails?.audio_tokens !== null || promptTokensDetails?.cached_tokens !== null) usageMetadata.input_token_details = {
				...promptTokensDetails?.audio_tokens !== null && { audio: promptTokensDetails?.audio_tokens },
				...promptTokensDetails?.cached_tokens !== null && { cache_read: promptTokensDetails?.cached_tokens }
			};
			if (completionTokensDetails?.audio_tokens !== null || completionTokensDetails?.reasoning_tokens !== null) usageMetadata.output_token_details = {
				...completionTokensDetails?.audio_tokens !== null && { audio: completionTokensDetails?.audio_tokens },
				...completionTokensDetails?.reasoning_tokens !== null && { reasoning: completionTokensDetails?.reasoning_tokens }
			};
			const generations = [];
			for (const part of data?.choices ?? []) {
				const text = part.message?.content ?? "";
				const generation = {
					text,
					message: this._convertCompletionsMessageToBaseMessage(part.message ?? { role: "assistant" }, data)
				};
				generation.generationInfo = {
					...part.finish_reason ? { finish_reason: part.finish_reason } : {},
					...part.logprobs ? { logprobs: part.logprobs } : {}
				};
				if (isAIMessage(generation.message)) generation.message.usage_metadata = usageMetadata;
				generation.message = new AIMessage(Object.fromEntries(Object.entries(generation.message).filter(([key]) => !key.startsWith("lc_"))));
				generations.push(generation);
			}
			return {
				generations,
				llmOutput: { tokenUsage: {
					promptTokens: usageMetadata.input_tokens,
					completionTokens: usageMetadata.output_tokens,
					totalTokens: usageMetadata.total_tokens
				} }
			};
		}
	}
	async *_streamResponseChunks(messages, options, runManager) {
		const messagesMapped = convertMessagesToCompletionsMessageParams({
			messages,
			model: this.model
		});
		const params = {
			...this.invocationParams(options, { streaming: true }),
			messages: messagesMapped,
			stream: true
		};
		let defaultRole;
		const streamIterable = await this.completionWithRetry(params, options);
		let usage;
		for await (const data of streamIterable) {
			const choice = data?.choices?.[0];
			if (data.usage) usage = data.usage;
			if (!choice) continue;
			const { delta } = choice;
			if (!delta) continue;
			const chunk = this._convertCompletionsDeltaToBaseMessageChunk(delta, data, defaultRole);
			defaultRole = delta.role ?? defaultRole;
			const newTokenIndices = {
				prompt: options.promptIndex ?? 0,
				completion: choice.index ?? 0
			};
			if (typeof chunk.content !== "string") {
				console.log("[WARNING]: Received non-string content from OpenAI. This is currently not supported.");
				continue;
			}
			const generationInfo = { ...newTokenIndices };
			if (choice.finish_reason != null) {
				generationInfo.finish_reason = choice.finish_reason;
				generationInfo.system_fingerprint = data.system_fingerprint;
				generationInfo.model_name = data.model;
				generationInfo.service_tier = data.service_tier;
			}
			if (this.logprobs) generationInfo.logprobs = choice.logprobs;
			const generationChunk = new ChatGenerationChunk({
				message: chunk,
				text: chunk.content,
				generationInfo
			});
			yield generationChunk;
			await runManager?.handleLLMNewToken(generationChunk.text ?? "", newTokenIndices, void 0, void 0, void 0, { chunk: generationChunk });
		}
		if (usage) {
			const inputTokenDetails = {
				...usage.prompt_tokens_details?.audio_tokens !== null && { audio: usage.prompt_tokens_details?.audio_tokens },
				...usage.prompt_tokens_details?.cached_tokens !== null && { cache_read: usage.prompt_tokens_details?.cached_tokens }
			};
			const outputTokenDetails = {
				...usage.completion_tokens_details?.audio_tokens !== null && { audio: usage.completion_tokens_details?.audio_tokens },
				...usage.completion_tokens_details?.reasoning_tokens !== null && { reasoning: usage.completion_tokens_details?.reasoning_tokens }
			};
			const generationChunk = new ChatGenerationChunk({
				message: new AIMessageChunk({
					content: "",
					response_metadata: { usage: { ...usage } },
					usage_metadata: {
						input_tokens: usage.prompt_tokens,
						output_tokens: usage.completion_tokens,
						total_tokens: usage.total_tokens,
						...Object.keys(inputTokenDetails).length > 0 && { input_token_details: inputTokenDetails },
						...Object.keys(outputTokenDetails).length > 0 && { output_token_details: outputTokenDetails }
					}
				}),
				text: ""
			});
			yield generationChunk;
		}
		if (options.signal?.aborted) throw new Error("AbortError");
	}
	async completionWithRetry(request, requestOptions) {
		const clientOptions = this._getClientOptions(requestOptions);
		const isParseableFormat = request.response_format && request.response_format.type === "json_schema";
		return this.caller.call(async () => {
			try {
				if (isParseableFormat && !request.stream) return await this.client.chat.completions.parse(request, clientOptions);
				else return await this.client.chat.completions.create(request, clientOptions);
			} catch (e) {
				const error = wrapOpenAIClientError(e);
				throw error;
			}
		});
	}
	/**
	* @deprecated
	* This function was hoisted into a publicly accessible function from a
	* different export, but to maintain backwards compatibility with chat models
	* that depend on ChatOpenAICompletions, we'll keep it here as an overridable
	* method. This will be removed in a future release
	*/
	_convertCompletionsDeltaToBaseMessageChunk(delta, rawResponse, defaultRole) {
		return convertCompletionsDeltaToBaseMessageChunk({
			delta,
			rawResponse,
			includeRawResponse: this.__includeRawResponse,
			defaultRole
		});
	}
	/**
	* @deprecated
	* This function was hoisted into a publicly accessible function from a
	* different export, but to maintain backwards compatibility with chat models
	* that depend on ChatOpenAICompletions, we'll keep it here as an overridable
	* method. This will be removed in a future release
	*/
	_convertCompletionsMessageToBaseMessage(message, rawResponse) {
		return convertCompletionsMessageToBaseMessage({
			message,
			rawResponse,
			includeRawResponse: this.__includeRawResponse
		});
	}
};

//#endregion
export { ChatOpenAICompletions };
//# sourceMappingURL=completions.js.map