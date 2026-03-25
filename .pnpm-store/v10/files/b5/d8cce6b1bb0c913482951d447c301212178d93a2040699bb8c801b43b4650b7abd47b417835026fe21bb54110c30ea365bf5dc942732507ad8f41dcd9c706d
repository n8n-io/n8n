import { BaseChain } from "../base.js";
import { LLMChain } from "../llm_chain.js";
import { API_RESPONSE_PROMPT_TEMPLATE, API_URL_PROMPT_TEMPLATE } from "./prompts.js";

//#region src/chains/api/api_chain.ts
/**
* Class that extends BaseChain and represents a chain specifically
* designed for making API requests and processing API responses.
*/
var APIChain = class APIChain extends BaseChain {
	apiAnswerChain;
	apiRequestChain;
	apiDocs;
	headers = {};
	inputKey = "question";
	outputKey = "output";
	get inputKeys() {
		return [this.inputKey];
	}
	get outputKeys() {
		return [this.outputKey];
	}
	constructor(fields) {
		super(fields);
		this.apiRequestChain = fields.apiRequestChain;
		this.apiAnswerChain = fields.apiAnswerChain;
		this.apiDocs = fields.apiDocs;
		this.inputKey = fields.inputKey ?? this.inputKey;
		this.outputKey = fields.outputKey ?? this.outputKey;
		this.headers = fields.headers ?? this.headers;
	}
	/** @ignore */
	async _call(values, runManager) {
		const question = values[this.inputKey];
		const api_url = await this.apiRequestChain.predict({
			question,
			api_docs: this.apiDocs
		}, runManager?.getChild("request"));
		const res = await fetch(api_url, { headers: this.headers });
		const api_response = await res.text();
		const answer = await this.apiAnswerChain.predict({
			question,
			api_docs: this.apiDocs,
			api_url,
			api_response
		}, runManager?.getChild("response"));
		return { [this.outputKey]: answer };
	}
	_chainType() {
		return "api_chain";
	}
	static async deserialize(data) {
		const { api_request_chain, api_answer_chain, api_docs } = data;
		if (!api_request_chain) throw new Error("LLMChain must have api_request_chain");
		if (!api_answer_chain) throw new Error("LLMChain must have api_answer_chain");
		if (!api_docs) throw new Error("LLMChain must have api_docs");
		return new APIChain({
			apiAnswerChain: await LLMChain.deserialize(api_answer_chain),
			apiRequestChain: await LLMChain.deserialize(api_request_chain),
			apiDocs: api_docs
		});
	}
	serialize() {
		return {
			_type: this._chainType(),
			api_answer_chain: this.apiAnswerChain.serialize(),
			api_request_chain: this.apiRequestChain.serialize(),
			api_docs: this.apiDocs
		};
	}
	/**
	* Static method to create a new APIChain from a BaseLanguageModel and API
	* documentation.
	* @param llm BaseLanguageModel instance.
	* @param apiDocs API documentation.
	* @param options Optional configuration options for the APIChain.
	* @returns New APIChain instance.
	*/
	static fromLLMAndAPIDocs(llm, apiDocs, options = {}) {
		const { apiUrlPrompt = API_URL_PROMPT_TEMPLATE, apiResponsePrompt = API_RESPONSE_PROMPT_TEMPLATE } = options;
		const apiRequestChain = new LLMChain({
			prompt: apiUrlPrompt,
			llm
		});
		const apiAnswerChain = new LLMChain({
			prompt: apiResponsePrompt,
			llm
		});
		return new this({
			apiAnswerChain,
			apiRequestChain,
			apiDocs,
			...options
		});
	}
};

//#endregion
export { APIChain };
//# sourceMappingURL=api_chain.js.map