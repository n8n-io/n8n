const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_utils_event_source_parse = require('../utils/event_source_parse.cjs');
const __langchain_core_outputs = require_rolldown_runtime.__toESM(require("@langchain/core/outputs"));
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_language_models_llms = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/llms"));

//#region src/llms/friendli.ts
var friendli_exports = {};
require_rolldown_runtime.__export(friendli_exports, { Friendli: () => Friendli });
/**
* The Friendli class is used to interact with Friendli inference Endpoint models.
* This requires your Friendli Token and Friendli Team which is autoloaded if not specified.
*/
var Friendli = class extends __langchain_core_language_models_llms.LLM {
	lc_serializable = true;
	static lc_name() {
		return "Friendli";
	}
	get lc_secrets() {
		return {
			friendliToken: "FRIENDLI_TOKEN",
			friendliTeam: "FRIENDLI_TEAM"
		};
	}
	model = "mixtral-8x7b-instruct-v0-1";
	baseUrl = "https://inference.friendli.ai";
	friendliToken;
	friendliTeam;
	frequencyPenalty;
	maxTokens;
	stop;
	temperature;
	topP;
	modelKwargs;
	constructor(fields) {
		super(fields);
		this.model = fields?.model ?? this.model;
		this.baseUrl = fields?.baseUrl ?? this.baseUrl;
		this.friendliToken = fields?.friendliToken ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("FRIENDLI_TOKEN");
		this.friendliTeam = fields?.friendliTeam ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("FRIENDLI_TEAM");
		this.frequencyPenalty = fields?.frequencyPenalty ?? this.frequencyPenalty;
		this.maxTokens = fields?.maxTokens ?? this.maxTokens;
		this.stop = fields?.stop ?? this.stop;
		this.temperature = fields?.temperature ?? this.temperature;
		this.topP = fields?.topP ?? this.topP;
		this.modelKwargs = fields?.modelKwargs ?? {};
		if (!this.friendliToken) throw new Error("Missing Friendli Token");
	}
	_llmType() {
		return "friendli";
	}
	constructHeaders(stream) {
		return {
			"Content-Type": "application/json",
			Accept: stream ? "text/event-stream" : "application/json",
			Authorization: `Bearer ${this.friendliToken}`,
			"X-Friendli-Team": this.friendliTeam ?? ""
		};
	}
	constructBody(prompt, stream, _options) {
		const body = JSON.stringify({
			prompt,
			stream,
			model: this.model,
			max_tokens: this.maxTokens,
			frequency_penalty: this.frequencyPenalty,
			stop: this.stop,
			temperature: this.temperature,
			top_p: this.topP,
			...this.modelKwargs
		});
		return body;
	}
	/**
	* Calls the Friendli endpoint and retrieves the result.
	* @param {string} prompt The input prompt.
	* @returns {Promise<string>} A promise that resolves to the generated string.
	*/
	/** @ignore */
	async _call(prompt, _options) {
		const response = await this.caller.call(async () => fetch(`${this.baseUrl}/v1/completions`, {
			method: "POST",
			headers: this.constructHeaders(false),
			body: this.constructBody(prompt, false, _options)
		}).then((res) => res.json()));
		return response.choices[0].text;
	}
	async *_streamResponseChunks(prompt, _options, runManager) {
		const response = await this.caller.call(async () => fetch(`${this.baseUrl}/v1/completions`, {
			method: "POST",
			headers: this.constructHeaders(true),
			body: this.constructBody(prompt, true, _options)
		}));
		if (response.status !== 200 || !response.body) {
			const errorResponse = await response.json();
			throw new Error(JSON.stringify(errorResponse));
		}
		const stream = require_utils_event_source_parse.convertEventStreamToIterableReadableDataStream(response.body);
		for await (const chunk of stream) if (chunk.event !== "complete") {
			const parsedChunk = JSON.parse(chunk);
			const generationChunk = new __langchain_core_outputs.GenerationChunk({ text: parsedChunk.text ?? "" });
			yield generationChunk;
			runManager?.handleLLMNewToken(generationChunk.text ?? "");
		} else {
			const parsedChunk = JSON.parse(chunk);
			const generationChunk = new __langchain_core_outputs.GenerationChunk({
				text: "",
				generationInfo: {
					choices: parsedChunk.choices,
					usage: parsedChunk.usage
				}
			});
			yield generationChunk;
		}
	}
};

//#endregion
exports.Friendli = Friendli;
Object.defineProperty(exports, 'friendli_exports', {
  enumerable: true,
  get: function () {
    return friendli_exports;
  }
});
//# sourceMappingURL=friendli.cjs.map