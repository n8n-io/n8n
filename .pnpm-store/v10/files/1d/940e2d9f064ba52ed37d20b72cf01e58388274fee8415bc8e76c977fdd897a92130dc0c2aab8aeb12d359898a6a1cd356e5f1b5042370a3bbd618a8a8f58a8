import { HTTPClient } from "@mistralai/mistralai/lib/http.js";
import { GenerationChunk } from "@langchain/core/outputs";
import { AsyncCaller } from "@langchain/core/utils/async_caller";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { chunkArray } from "@langchain/core/utils/chunk_array";
import { LLM } from "@langchain/core/language_models/llms";

//#region src/llms.ts
/**
* MistralAI completions LLM.
*/
var MistralAI = class extends LLM {
	static lc_name() {
		return "MistralAI";
	}
	lc_namespace = [
		"langchain",
		"llms",
		"mistralai"
	];
	lc_serializable = true;
	model = "codestral-latest";
	temperature = 0;
	topP;
	maxTokens;
	randomSeed;
	streaming = false;
	batchSize = 20;
	apiKey;
	/**
	* @deprecated use serverURL instead
	*/
	endpoint;
	serverURL;
	maxRetries;
	maxConcurrency;
	beforeRequestHooks;
	requestErrorHooks;
	responseHooks;
	httpClient;
	constructor(fields) {
		super(fields ?? {});
		this.model = fields?.model ?? this.model;
		this.temperature = fields?.temperature ?? this.temperature;
		this.topP = fields?.topP ?? this.topP;
		this.maxTokens = fields?.maxTokens ?? this.maxTokens;
		this.randomSeed = fields?.randomSeed ?? this.randomSeed;
		this.batchSize = fields?.batchSize ?? this.batchSize;
		this.streaming = fields?.streaming ?? this.streaming;
		this.serverURL = fields?.serverURL ?? this.serverURL;
		this.maxRetries = fields?.maxRetries;
		this.maxConcurrency = fields?.maxConcurrency;
		this.beforeRequestHooks = fields?.beforeRequestHooks ?? this.beforeRequestHooks;
		this.requestErrorHooks = fields?.requestErrorHooks ?? this.requestErrorHooks;
		this.responseHooks = fields?.responseHooks ?? this.responseHooks;
		this.httpClient = fields?.httpClient ?? this.httpClient;
		const apiKey = fields?.apiKey ?? getEnvironmentVariable("MISTRAL_API_KEY");
		if (!apiKey) throw new Error(`MistralAI requires an API key to be set.
Either provide one via the "apiKey" field in the constructor, or set the "MISTRAL_API_KEY" environment variable.`);
		this.apiKey = apiKey;
		this.addAllHooksToHttpClient();
	}
	get lc_secrets() {
		return { apiKey: "MISTRAL_API_KEY" };
	}
	get lc_aliases() {
		return { apiKey: "mistral_api_key" };
	}
	_llmType() {
		return "mistralai";
	}
	invocationParams(options) {
		return {
			model: this.model,
			suffix: options.suffix,
			temperature: this.temperature,
			maxTokens: this.maxTokens,
			topP: this.topP,
			randomSeed: this.randomSeed,
			stop: options.stop
		};
	}
	/**
	* For some given input string and options, return a string output.
	*
	* Despite the fact that `invoke` is overridden below, we still need this
	* in order to handle public APi calls to `generate()`.
	*/
	async _call(prompt, options) {
		const params = {
			...this.invocationParams(options),
			prompt
		};
		const result = await this.completionWithRetry(params, options, false);
		let content = result?.choices?.[0].message.content ?? "";
		if (Array.isArray(content)) content = content[0].type === "text" ? content[0].text : "";
		return content;
	}
	async _generate(prompts, options, runManager) {
		const subPrompts = chunkArray(prompts, this.batchSize);
		const choices = [];
		const params = this.invocationParams(options);
		for (let i = 0; i < subPrompts.length; i += 1) {
			const data = await (async () => {
				if (this.streaming) {
					const responseData = [];
					for (let x = 0; x < subPrompts[i].length; x += 1) {
						const choices$1 = [];
						let response;
						const stream = await this.completionWithRetry({
							...params,
							prompt: subPrompts[i][x]
						}, options, true);
						for await (const { data: data$1 } of stream) {
							if (!response) response = {
								id: data$1.id,
								object: "chat.completion",
								created: data$1.created,
								model: data$1.model
							};
							for (const part of data$1.choices) {
								let content = part.delta.content ?? "";
								if (Array.isArray(content)) {
									let strContent = "";
									for (const contentChunk of content) if (contentChunk.type === "text") strContent += contentChunk.text;
									else if (contentChunk.type === "image_url") {
										const imageURL = typeof contentChunk.imageUrl === "string" ? contentChunk.imageUrl : contentChunk.imageUrl.url;
										strContent += imageURL;
									}
									content = strContent;
								}
								if (!choices$1[part.index]) choices$1[part.index] = {
									index: part.index,
									message: {
										role: "assistant",
										content,
										toolCalls: null
									},
									finishReason: part.finishReason ?? "length"
								};
								else {
									const choice = choices$1[part.index];
									choice.message.content += content;
									choice.finishReason = part.finishReason ?? "length";
								}
								runManager?.handleLLMNewToken(content, {
									prompt: part.index,
									completion: part.index
								});
							}
						}
						if (options.signal?.aborted) throw new Error("AbortError");
						responseData.push({
							...response,
							choices: choices$1
						});
					}
					return responseData;
				} else {
					const responseData = [];
					for (let x = 0; x < subPrompts[i].length; x += 1) {
						const res = await this.completionWithRetry({
							...params,
							prompt: subPrompts[i][x]
						}, options, false);
						responseData.push(res);
					}
					return responseData;
				}
			})();
			choices.push(...data.map((d) => d.choices ?? []));
		}
		const generations = choices.map((promptChoices) => promptChoices.map((choice) => {
			let text = choice.message?.content ?? "";
			if (Array.isArray(text)) text = text[0].type === "text" ? text[0].text : "";
			return {
				text,
				generationInfo: { finishReason: choice.finishReason }
			};
		}));
		return { generations };
	}
	async completionWithRetry(request, options, stream) {
		const { Mistral } = await this.imports();
		const caller = new AsyncCaller({
			maxConcurrency: options.maxConcurrency || this.maxConcurrency,
			maxRetries: this.maxRetries
		});
		const client = new Mistral({
			apiKey: this.apiKey,
			serverURL: this.serverURL,
			timeoutMs: options.timeout,
			...this.httpClient ? { httpClient: this.httpClient } : {}
		});
		return caller.callWithOptions({ signal: options.signal }, async () => {
			try {
				let res;
				if (stream) res = await client.fim.stream(request);
				else res = await client.fim.complete(request);
				return res;
			} catch (e) {
				if (e.message?.includes("status: 400") || e.message?.toLowerCase().includes("status 400") || e.message?.includes("validation failed")) e.status = 400;
				throw e;
			}
		});
	}
	async *_streamResponseChunks(prompt, options, runManager) {
		const params = {
			...this.invocationParams(options),
			prompt
		};
		const stream = await this.completionWithRetry(params, options, true);
		for await (const message of stream) {
			const { data } = message;
			const choice = data?.choices[0];
			if (!choice) continue;
			let text = choice.delta.content ?? "";
			if (Array.isArray(text)) text = text[0].type === "text" ? text[0].text : "";
			const chunk = new GenerationChunk({
				text,
				generationInfo: {
					finishReason: choice.finishReason,
					tokenUsage: data.usage
				}
			});
			yield chunk;
			runManager?.handleLLMNewToken(chunk.text ?? "");
		}
		if (options.signal?.aborted) throw new Error("AbortError");
	}
	addAllHooksToHttpClient() {
		try {
			this.removeAllHooksFromHttpClient();
			const hasHooks = [
				this.beforeRequestHooks,
				this.requestErrorHooks,
				this.responseHooks
			].some((hook) => hook && hook.length > 0);
			if (hasHooks && !this.httpClient) this.httpClient = new HTTPClient();
			if (this.beforeRequestHooks) for (const hook of this.beforeRequestHooks) this.httpClient?.addHook("beforeRequest", hook);
			if (this.requestErrorHooks) for (const hook of this.requestErrorHooks) this.httpClient?.addHook("requestError", hook);
			if (this.responseHooks) for (const hook of this.responseHooks) this.httpClient?.addHook("response", hook);
		} catch {
			throw new Error("Error in adding all hooks");
		}
	}
	removeAllHooksFromHttpClient() {
		try {
			if (this.beforeRequestHooks) for (const hook of this.beforeRequestHooks) this.httpClient?.removeHook("beforeRequest", hook);
			if (this.requestErrorHooks) for (const hook of this.requestErrorHooks) this.httpClient?.removeHook("requestError", hook);
			if (this.responseHooks) for (const hook of this.responseHooks) this.httpClient?.removeHook("response", hook);
		} catch {
			throw new Error("Error in removing hooks");
		}
	}
	removeHookFromHttpClient(hook) {
		try {
			this.httpClient?.removeHook("beforeRequest", hook);
			this.httpClient?.removeHook("requestError", hook);
			this.httpClient?.removeHook("response", hook);
		} catch {
			throw new Error("Error in removing hook");
		}
	}
	/** @ignore */
	async imports() {
		const { Mistral } = await import("@mistralai/mistralai");
		return { Mistral };
	}
};

//#endregion
export { MistralAI };
//# sourceMappingURL=llms.js.map