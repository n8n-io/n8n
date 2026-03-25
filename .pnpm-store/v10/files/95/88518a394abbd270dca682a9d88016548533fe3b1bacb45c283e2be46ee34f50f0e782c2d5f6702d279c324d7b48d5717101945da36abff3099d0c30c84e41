const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_outputs = require_rolldown_runtime.__toESM(require("@langchain/core/outputs"));
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const lodash = require_rolldown_runtime.__toESM(require("lodash"));
const portkey_ai = require_rolldown_runtime.__toESM(require("portkey-ai"));
const __langchain_core_language_models_llms = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/llms"));

//#region src/llms/portkey.ts
var portkey_exports = {};
require_rolldown_runtime.__export(portkey_exports, {
	Portkey: () => Portkey,
	PortkeySession: () => PortkeySession,
	getPortkeySession: () => getPortkeySession
});
const readEnv = (env, default_val) => (0, __langchain_core_utils_env.getEnvironmentVariable)(env) ?? default_val;
var PortkeySession = class {
	portkey;
	constructor(options = {}) {
		if (!options.apiKey) options.apiKey = readEnv("PORTKEY_API_KEY");
		if (!options.baseURL) options.baseURL = readEnv("PORTKEY_BASE_URL", "https://api.portkey.ai");
		this.portkey = new portkey_ai.Portkey({});
		this.portkey.llms = [{}];
		if (!options.apiKey) throw new Error("Set Portkey ApiKey in PORTKEY_API_KEY env variable");
		this.portkey = new portkey_ai.Portkey(options);
	}
};
const defaultPortkeySession = [];
/**
* Get a session for the Portkey API. If one already exists with the same options,
* it will be returned. Otherwise, a new session will be created.
* @param options
* @returns
*/
function getPortkeySession(options = {}) {
	let session = defaultPortkeySession.find((session$1) => lodash.default.isEqual(session$1.options, options))?.session;
	if (!session) {
		session = new PortkeySession(options);
		defaultPortkeySession.push({
			session,
			options
		});
	}
	return session;
}
/**
* @example
* ```typescript
* const model = new Portkey({
*   mode: "single",
*   llms: [
*     {
*       provider: "openai",
*       virtual_key: "open-ai-key-1234",
*       model: "gpt-3.5-turbo-instruct",
*       max_tokens: 2000,
*     },
*   ],
* });
*
* // Stream the output of the model and process it
* const res = await model.stream(
*   "Question: Write a story about a king\nAnswer:"
* );
* for await (const i of res) {
*   process.stdout.write(i);
* }
* ```
*/
var Portkey = class extends __langchain_core_language_models_llms.BaseLLM {
	apiKey = void 0;
	baseURL = void 0;
	mode = void 0;
	llms = void 0;
	session;
	constructor(init) {
		super(init ?? {});
		this.apiKey = init?.apiKey;
		this.baseURL = init?.baseURL;
		this.mode = init?.mode;
		this.llms = init?.llms;
		this.session = getPortkeySession({
			apiKey: this.apiKey,
			baseURL: this.baseURL,
			llms: this.llms,
			mode: this.mode
		});
	}
	_llmType() {
		return "portkey";
	}
	async _generate(prompts, options, _$1) {
		const choices = [];
		for (let i = 0; i < prompts.length; i += 1) {
			const response = await this.session.portkey.completions.create({
				prompt: prompts[i],
				...options,
				stream: false
			});
			choices.push(response.choices);
		}
		const generations = choices.map((promptChoices) => promptChoices.map((choice) => ({
			text: choice.text ?? "",
			generationInfo: {
				finishReason: choice.finish_reason,
				logprobs: choice.logprobs
			}
		})));
		return { generations };
	}
	async *_streamResponseChunks(input, options, runManager) {
		const response = await this.session.portkey.completions.create({
			prompt: input,
			...options,
			stream: true
		});
		for await (const data of response) {
			const choice = data?.choices[0];
			if (!choice) continue;
			const chunk = new __langchain_core_outputs.GenerationChunk({
				text: choice.text ?? "",
				generationInfo: { finishReason: choice.finish_reason }
			});
			yield chunk;
			runManager?.handleLLMNewToken(chunk.text ?? "");
		}
		if (options.signal?.aborted) throw new Error("AbortError");
	}
};

//#endregion
exports.Portkey = Portkey;
exports.PortkeySession = PortkeySession;
exports.getPortkeySession = getPortkeySession;
Object.defineProperty(exports, 'portkey_exports', {
  enumerable: true,
  get: function () {
    return portkey_exports;
  }
});
//# sourceMappingURL=portkey.cjs.map