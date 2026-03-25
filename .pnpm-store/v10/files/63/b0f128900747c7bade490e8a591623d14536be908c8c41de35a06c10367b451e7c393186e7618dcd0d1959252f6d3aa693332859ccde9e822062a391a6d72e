//#region src/example_selectors/conditional.ts
/**
* Abstract class that defines the interface for selecting a prompt for a
* given language model.
*/
var BasePromptSelector = class {
	/**
	* Asynchronous version of `getPrompt` that also accepts an options object
	* for partial variables.
	* @param llm The language model for which to get a prompt.
	* @param options Optional object for partial variables.
	* @returns A Promise that resolves to a prompt template.
	*/
	async getPromptAsync(llm, options) {
		return this.getPrompt(llm).partial(options?.partialVariables ?? {});
	}
};
/**
* Concrete implementation of `BasePromptSelector` that selects a prompt
* based on a set of conditions. It has a default prompt that it returns
* if none of the conditions are met.
*/
var ConditionalPromptSelector = class extends BasePromptSelector {
	defaultPrompt;
	conditionals;
	constructor(default_prompt, conditionals = []) {
		super();
		this.defaultPrompt = default_prompt;
		this.conditionals = conditionals;
	}
	/**
	* Method that selects a prompt based on a set of conditions. If none of
	* the conditions are met, it returns the default prompt.
	* @param llm The language model for which to get a prompt.
	* @returns A prompt template.
	*/
	getPrompt(llm) {
		for (const [condition, prompt] of this.conditionals) if (condition(llm)) return prompt;
		return this.defaultPrompt;
	}
};
/**
* Type guard function that checks if a given language model is of type
* `BaseLLM`.
*/
function isLLM(llm) {
	return llm._modelType() === "base_llm";
}
/**
* Type guard function that checks if a given language model is of type
* `BaseChatModel`.
*/
function isChatModel(llm) {
	return llm._modelType() === "base_chat_model";
}
//#endregion
exports.BasePromptSelector = BasePromptSelector;
exports.ConditionalPromptSelector = ConditionalPromptSelector;
exports.isChatModel = isChatModel;
exports.isLLM = isLLM;

//# sourceMappingURL=conditional.cjs.map