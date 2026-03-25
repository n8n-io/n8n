import { LLMChain } from "../llm_chain.js";
import { RouterChain } from "./multi_route.js";

//#region src/chains/router/llm_router.ts
/**
* A class that represents an LLM router chain in the LangChain framework.
* It extends the RouterChain class and implements the LLMRouterChainInput
* interface. It provides additional functionality specific to LLMs and
* routing based on LLM predictions.
*/
var LLMRouterChain = class LLMRouterChain extends RouterChain {
	llmChain;
	constructor(fields) {
		super(fields);
		this.llmChain = fields.llmChain;
	}
	get inputKeys() {
		return this.llmChain.inputKeys;
	}
	async _call(values, runManager) {
		return this.llmChain.predict(values, runManager?.getChild());
	}
	_chainType() {
		return "llm_router_chain";
	}
	/**
	* A static method that creates an instance of LLMRouterChain from a
	* BaseLanguageModel and a BasePromptTemplate. It takes in an optional
	* options object and returns an instance of LLMRouterChain with the
	* specified LLMChain.
	* @param llm A BaseLanguageModel instance.
	* @param prompt A BasePromptTemplate instance.
	* @param options Optional LLMRouterChainInput object, excluding "llmChain".
	* @returns An instance of LLMRouterChain.
	*/
	static fromLLM(llm, prompt, options) {
		const llmChain = new LLMChain({
			llm,
			prompt
		});
		return new LLMRouterChain({
			...options,
			llmChain
		});
	}
};

//#endregion
export { LLMRouterChain };
//# sourceMappingURL=llm_router.js.map