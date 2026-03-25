import { __export } from "../_virtual/rolldown_runtime.js";
import { GenerationChunk } from "@langchain/core/outputs";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import _ from "lodash";
import { Portkey as Portkey$1 } from "portkey-ai";
import { BaseLLM } from "@langchain/core/language_models/llms";

//#region src/llms/portkey.ts
var portkey_exports = {};
__export(portkey_exports, {
	Portkey: () => Portkey,
	PortkeySession: () => PortkeySession,
	getPortkeySession: () => getPortkeySession
});
const readEnv = (env, default_val) => getEnvironmentVariable(env) ?? default_val;
var PortkeySession = class {
	portkey;
	constructor(options = {}) {
		if (!options.apiKey) options.apiKey = readEnv("PORTKEY_API_KEY");
		if (!options.baseURL) options.baseURL = readEnv("PORTKEY_BASE_URL", "https://api.portkey.ai");
		this.portkey = new Portkey$1({});
		this.portkey.llms = [{}];
		if (!options.apiKey) throw new Error("Set Portkey ApiKey in PORTKEY_API_KEY env variable");
		this.portkey = new Portkey$1(options);
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
	let session = defaultPortkeySession.find((session$1) => _.isEqual(session$1.options, options))?.session;
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
var Portkey = class extends BaseLLM {
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
			const chunk = new GenerationChunk({
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
export { Portkey, PortkeySession, getPortkeySession, portkey_exports };
//# sourceMappingURL=portkey.js.map