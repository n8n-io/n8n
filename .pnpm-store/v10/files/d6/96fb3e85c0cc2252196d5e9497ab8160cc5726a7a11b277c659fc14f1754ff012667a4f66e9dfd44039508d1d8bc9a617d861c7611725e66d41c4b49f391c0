import { BaseStringPromptTemplate } from "./string.js";
import { checkValidTemplate, parseTemplate, renderTemplate } from "./template.js";
//#region src/prompts/prompt.ts
/**
* Schema to represent a basic prompt for an LLM.
* @augments BasePromptTemplate
* @augments PromptTemplateInput
*
* @example
* ```ts
* import { PromptTemplate } from "langchain/prompts";
*
* const prompt = new PromptTemplate({
*   inputVariables: ["foo"],
*   template: "Say {foo}",
* });
* ```
*/
var PromptTemplate = class PromptTemplate extends BaseStringPromptTemplate {
	static lc_name() {
		return "PromptTemplate";
	}
	template;
	templateFormat = "f-string";
	validateTemplate = true;
	/**
	* Additional fields which should be included inside
	* the message content array if using a complex message
	* content.
	*/
	additionalContentFields;
	constructor(input) {
		super(input);
		if (input.templateFormat === "mustache" && input.validateTemplate === void 0) this.validateTemplate = false;
		Object.assign(this, input);
		if (this.validateTemplate) {
			if (this.templateFormat === "mustache") throw new Error("Mustache templates cannot be validated.");
			let totalInputVariables = this.inputVariables;
			if (this.partialVariables) totalInputVariables = totalInputVariables.concat(Object.keys(this.partialVariables));
			checkValidTemplate(this.template, this.templateFormat, totalInputVariables);
		}
	}
	_getPromptType() {
		return "prompt";
	}
	/**
	* Formats the prompt template with the provided values.
	* @param values The values to be used to format the prompt template.
	* @returns A promise that resolves to a string which is the formatted prompt.
	*/
	async format(values) {
		const allValues = await this.mergePartialAndUserVariables(values);
		return renderTemplate(this.template, this.templateFormat, allValues);
	}
	/**
	* Take examples in list format with prefix and suffix to create a prompt.
	*
	* Intended to be used a a way to dynamically create a prompt from examples.
	*
	* @param examples - List of examples to use in the prompt.
	* @param suffix - String to go after the list of examples. Should generally set up the user's input.
	* @param inputVariables - A list of variable names the final prompt template will expect
	* @param exampleSeparator - The separator to use in between examples
	* @param prefix - String that should go before any examples. Generally includes examples.
	*
	* @returns The final prompt template generated.
	*/
	static fromExamples(examples, suffix, inputVariables, exampleSeparator = "\n\n", prefix = "") {
		return new PromptTemplate({
			inputVariables,
			template: [
				prefix,
				...examples,
				suffix
			].join(exampleSeparator)
		});
	}
	static fromTemplate(template, options) {
		const { templateFormat = "f-string", ...rest } = options ?? {};
		const names = /* @__PURE__ */ new Set();
		parseTemplate(template, templateFormat).forEach((node) => {
			if (node.type === "variable") names.add(node.name);
		});
		return new PromptTemplate({
			inputVariables: [...names],
			templateFormat,
			template,
			...rest
		});
	}
	/**
	* Partially applies values to the prompt template.
	* @param values The values to be partially applied to the prompt template.
	* @returns A new instance of PromptTemplate with the partially applied values.
	*/
	async partial(values) {
		const newInputVariables = this.inputVariables.filter((iv) => !(iv in values));
		const newPartialVariables = {
			...this.partialVariables ?? {},
			...values
		};
		return new PromptTemplate({
			...this,
			inputVariables: newInputVariables,
			partialVariables: newPartialVariables
		});
	}
	serialize() {
		if (this.outputParser !== void 0) throw new Error("Cannot serialize a prompt template with an output parser");
		return {
			_type: this._getPromptType(),
			input_variables: this.inputVariables,
			template: this.template,
			template_format: this.templateFormat
		};
	}
	static async deserialize(data) {
		if (!data.template) throw new Error("Prompt template must have a template");
		return new PromptTemplate({
			inputVariables: data.input_variables,
			template: data.template,
			templateFormat: data.template_format
		});
	}
};
//#endregion
export { PromptTemplate };

//# sourceMappingURL=prompt.js.map