import { DefaultGeminiSafetyHandler } from "./utils/gemini.js";
import { copyAIModelParams, copyAndValidateModelParamsInto } from "./utils/common.js";
import { ensureParams } from "./utils/failed_handler.js";
import { AbstractGoogleLLMConnection } from "./connection.js";
import { ApiKeyGoogleAuth } from "./auth.js";
import { ChatGoogleBase } from "./chat_models.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { GenerationChunk } from "@langchain/core/outputs";
import { CallbackManager } from "@langchain/core/callbacks/manager";
import { BaseLLM, LLM } from "@langchain/core/language_models/llms";

//#region src/llms.ts
var GoogleLLMConnection = class extends AbstractGoogleLLMConnection {
	async formatContents(input, _parameters) {
		return [{
			role: "user",
			parts: await this.api.messageContentToParts(input)
		}];
	}
};
var ProxyChatGoogle = class extends ChatGoogleBase {
	constructor(fields) {
		super(fields);
		this._addVersion("@langchain/google-common", "2.1.24");
	}
	buildAbstractedClient(fields) {
		return fields.connection.client;
	}
};
/**
* Integration with an LLM.
*/
var GoogleBaseLLM = class extends LLM {
	static lc_name() {
		return "GoogleLLM";
	}
	get lc_secrets() {
		return { authOptions: "GOOGLE_AUTH_OPTIONS" };
	}
	originalFields;
	lc_serializable = true;
	modelName = "gemini-pro";
	model = "gemini-pro";
	temperature = .7;
	maxOutputTokens = 1024;
	topP = .8;
	topK = 40;
	stopSequences = [];
	safetySettings = [];
	safetyHandler;
	responseMimeType = "text/plain";
	connection;
	streamedConnection;
	constructor(fields) {
		super(ensureParams(fields));
		this.originalFields = fields;
		copyAndValidateModelParamsInto(fields, this);
		this.safetyHandler = fields?.safetyHandler ?? new DefaultGeminiSafetyHandler();
		const client = this.buildClient(fields);
		this.buildConnection(fields ?? {}, client);
	}
	buildApiKeyClient(apiKey) {
		return new ApiKeyGoogleAuth(apiKey);
	}
	buildApiKey(fields) {
		return fields?.apiKey ?? getEnvironmentVariable("GOOGLE_API_KEY");
	}
	buildClient(fields) {
		const apiKey = this.buildApiKey(fields);
		if (apiKey) return this.buildApiKeyClient(apiKey);
		else return this.buildAbstractedClient(fields);
	}
	buildConnection(fields, client) {
		this.connection = new GoogleLLMConnection({
			...fields,
			...this
		}, this.caller, client, false);
		this.streamedConnection = new GoogleLLMConnection({
			...fields,
			...this
		}, this.caller, client, true);
	}
	get platform() {
		return this.connection.platform;
	}
	_llmType() {
		return "googlellm";
	}
	formatPrompt(prompt) {
		return prompt;
	}
	/**
	* For some given input string and options, return a string output.
	*
	* Despite the fact that `invoke` is overridden below, we still need this
	* in order to handle public APi calls to `generate()`.
	*/
	async _call(prompt, options) {
		const parameters = copyAIModelParams(this, options);
		const result = await this.connection.request(prompt, parameters, options);
		return this.connection.api.responseToString(result);
	}
	async *_streamIterator(input, options) {
		const prompt = BaseLLM._convertInputToPromptValue(input);
		const [runnableConfig, callOptions] = this._separateRunnableConfigFromCallOptions(options);
		const callbackManager_ = await CallbackManager.configure(runnableConfig.callbacks, this.callbacks, runnableConfig.tags, this.tags, runnableConfig.metadata, this.metadata, { verbose: this.verbose });
		const extra = {
			options: callOptions,
			invocation_params: this?.invocationParams(callOptions),
			batch_size: 1
		};
		const runManagers = await callbackManager_?.handleLLMStart(this.toJSON(), [prompt.toString()], void 0, void 0, extra, void 0, void 0, runnableConfig.runName);
		let generation = new GenerationChunk({ text: "" });
		const proxyChat = this.createProxyChat();
		try {
			for await (const chunk of proxyChat._streamIterator(input, options)) {
				const stringValue = this.connection.api.chunkToString(chunk);
				const generationChunk = new GenerationChunk({ text: stringValue });
				generation = generation.concat(generationChunk);
				yield stringValue;
			}
		} catch (err) {
			await Promise.all((runManagers ?? []).map((runManager) => runManager?.handleLLMError(err)));
			throw err;
		}
		await Promise.all((runManagers ?? []).map((runManager) => runManager?.handleLLMEnd({ generations: [[generation]] })));
	}
	async predictMessages(messages, options, _callbacks) {
		const { content } = messages[0];
		const result = await this.connection.request(content, {}, options);
		return this.connection.api.responseToBaseMessage(result);
	}
	/**
	* Internal implementation detail to allow Google LLMs to support
	* multimodal input by delegating to the chat model implementation.
	*
	* TODO: Replace with something less hacky.
	*/
	createProxyChat() {
		return new ProxyChatGoogle({
			...this.originalFields,
			connection: this.connection
		});
	}
	async invoke(input, options) {
		const stream = await this._streamIterator(input, options);
		let generatedOutput = "";
		for await (const chunk of stream) generatedOutput += chunk;
		return generatedOutput;
	}
};

//#endregion
export { GoogleBaseLLM };
//# sourceMappingURL=llms.js.map