import { StringPromptValue } from "../prompt_values.js";
import { BasePromptTemplate } from "./base.js";
//#region src/prompts/string.ts
/**
* Base class for string prompt templates. It extends the
* BasePromptTemplate class and overrides the formatPromptValue method to
* return a StringPromptValue.
*/
var BaseStringPromptTemplate = class extends BasePromptTemplate {
	/**
	* Formats the prompt given the input values and returns a formatted
	* prompt value.
	* @param values The input values to format the prompt.
	* @returns A Promise that resolves to a formatted prompt value.
	*/
	async formatPromptValue(values) {
		return new StringPromptValue(await this.format(values));
	}
};
//#endregion
export { BaseStringPromptTemplate };

//# sourceMappingURL=string.js.map