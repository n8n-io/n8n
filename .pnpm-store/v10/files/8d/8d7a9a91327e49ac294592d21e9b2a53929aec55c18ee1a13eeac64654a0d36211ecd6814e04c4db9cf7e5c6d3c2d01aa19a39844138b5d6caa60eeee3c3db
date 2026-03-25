const require_prompt_values = require("../prompt_values.cjs");
const require_base = require("./base.cjs");
//#region src/prompts/string.ts
/**
* Base class for string prompt templates. It extends the
* BasePromptTemplate class and overrides the formatPromptValue method to
* return a StringPromptValue.
*/
var BaseStringPromptTemplate = class extends require_base.BasePromptTemplate {
	/**
	* Formats the prompt given the input values and returns a formatted
	* prompt value.
	* @param values The input values to format the prompt.
	* @returns A Promise that resolves to a formatted prompt value.
	*/
	async formatPromptValue(values) {
		return new require_prompt_values.StringPromptValue(await this.format(values));
	}
};
//#endregion
exports.BaseStringPromptTemplate = BaseStringPromptTemplate;

//# sourceMappingURL=string.cjs.map