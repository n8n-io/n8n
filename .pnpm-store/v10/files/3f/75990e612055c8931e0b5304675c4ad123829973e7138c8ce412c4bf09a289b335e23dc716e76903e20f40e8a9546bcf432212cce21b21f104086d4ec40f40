import { getCohereClient } from "./client.js";
import { LLM } from "@langchain/core/language_models/llms";

//#region src/llms.ts
/**
* Class representing a Cohere Large Language Model (LLM). It interacts
* with the Cohere API to generate text completions.
* @example
* ```typescript
* const model = new Cohere({
*   temperature: 0.7,
*   maxTokens: 20,
*   maxRetries: 5,
* });
*
* const res = await model.invoke(
*   "Question: What would be a good company name for a company that makes colorful socks?\nAnswer:"
* );
* console.log({ res });
* ```
*/
var Cohere = class extends LLM {
	static lc_name() {
		return "Cohere";
	}
	get lc_secrets() {
		return {
			apiKey: "COHERE_API_KEY",
			api_key: "COHERE_API_KEY"
		};
	}
	get lc_aliases() {
		return {
			apiKey: "cohere_api_key",
			api_key: "cohere_api_key"
		};
	}
	lc_serializable = true;
	temperature = 0;
	maxTokens = 250;
	model;
	apiKey;
	client;
	constructor(fields) {
		super(fields ?? {});
		this.client = getCohereClient(fields);
		this.maxTokens = fields?.maxTokens ?? this.maxTokens;
		this.temperature = fields?.temperature ?? this.temperature;
		this.model = fields?.model ?? this.model;
	}
	_llmType() {
		return "cohere";
	}
	invocationParams(options) {
		const params = {
			model: this.model,
			numGenerations: options.numGenerations,
			maxTokens: options.maxTokens ?? this.maxTokens,
			truncate: options.truncate,
			temperature: options.temperature ?? this.temperature,
			preset: options.preset,
			endSequences: options.endSequences,
			stopSequences: options.stop ?? options.stopSequences,
			k: options.k,
			p: options.p,
			frequencyPenalty: options.frequencyPenalty,
			presencePenalty: options.presencePenalty,
			returnLikelihoods: options.returnLikelihoods
		};
		return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== void 0));
	}
	/** @ignore */
	async _call(prompt, options, runManager) {
		const generateResponse = await this.caller.callWithOptions({ signal: options.signal }, async () => {
			let response;
			try {
				response = await this.client.generate({
					prompt,
					...this.invocationParams(options)
				});
			} catch (e) {
				e.status = e.status ?? e.statusCode;
				throw e;
			}
			return response;
		});
		try {
			await runManager?.handleLLMNewToken(generateResponse.generations[0].text);
			return generateResponse.generations[0].text;
		} catch {
			console.log(generateResponse);
			throw new Error("Could not parse response.");
		}
	}
};

//#endregion
export { Cohere };
//# sourceMappingURL=llms.js.map