import { ImagePromptValue } from "../prompt_values.js";
import { BasePromptTemplate } from "./base.js";
import { checkValidTemplate, renderTemplate } from "./template.js";
//#region src/prompts/image.ts
/**
* An image prompt template for a multimodal model.
*/
var ImagePromptTemplate = class ImagePromptTemplate extends BasePromptTemplate {
	static lc_name() {
		return "ImagePromptTemplate";
	}
	lc_namespace = [
		"langchain_core",
		"prompts",
		"image"
	];
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
		this.template = input.template;
		this.templateFormat = input.templateFormat ?? this.templateFormat;
		this.validateTemplate = input.validateTemplate ?? this.validateTemplate;
		this.additionalContentFields = input.additionalContentFields;
		if (this.validateTemplate) {
			let totalInputVariables = this.inputVariables;
			if (this.partialVariables) totalInputVariables = totalInputVariables.concat(Object.keys(this.partialVariables));
			checkValidTemplate([{
				type: "image_url",
				image_url: this.template
			}], this.templateFormat, totalInputVariables);
		}
	}
	_getPromptType() {
		return "prompt";
	}
	/**
	* Partially applies values to the prompt template.
	* @param values The values to be partially applied to the prompt template.
	* @returns A new instance of ImagePromptTemplate with the partially applied values.
	*/
	async partial(values) {
		const newInputVariables = this.inputVariables.filter((iv) => !(iv in values));
		const newPartialVariables = {
			...this.partialVariables ?? {},
			...values
		};
		return new ImagePromptTemplate({
			...this,
			inputVariables: newInputVariables,
			partialVariables: newPartialVariables
		});
	}
	/**
	* Formats the prompt template with the provided values.
	* @param values The values to be used to format the prompt template.
	* @returns A promise that resolves to a string which is the formatted prompt.
	*/
	async format(values) {
		const formatted = {};
		for (const [key, value] of Object.entries(this.template)) if (typeof value === "string") formatted[key] = renderTemplate(value, this.templateFormat, values);
		else formatted[key] = value;
		const url = values.url || formatted.url;
		const detail = values.detail || formatted.detail;
		if (!url) throw new Error("Must provide either an image URL.");
		if (typeof url !== "string") throw new Error("url must be a string.");
		const output = { url };
		if (detail) output.detail = detail;
		return output;
	}
	/**
	* Formats the prompt given the input values and returns a formatted
	* prompt value.
	* @param values The input values to format the prompt.
	* @returns A Promise that resolves to a formatted prompt value.
	*/
	async formatPromptValue(values) {
		return new ImagePromptValue(await this.format(values));
	}
};
//#endregion
export { ImagePromptTemplate };

//# sourceMappingURL=image.js.map