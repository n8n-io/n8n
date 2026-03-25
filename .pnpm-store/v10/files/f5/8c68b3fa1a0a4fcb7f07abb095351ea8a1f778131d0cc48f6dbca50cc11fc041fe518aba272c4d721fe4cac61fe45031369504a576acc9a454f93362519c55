import { BaseStringPromptTemplate } from "./string.js";
import { checkValidTemplate, renderTemplate } from "./template.js";
import { PromptTemplate } from "./prompt.js";
import { BaseChatPromptTemplate } from "./chat.js";
//#region src/prompts/few_shot.ts
/**
* Prompt template that contains few-shot examples.
* @augments BasePromptTemplate
* @augments FewShotPromptTemplateInput
* @example
* ```typescript
* const examplePrompt = PromptTemplate.fromTemplate(
*   "Input: {input}\nOutput: {output}",
* );
*
* const exampleSelector = await SemanticSimilarityExampleSelector.fromExamples(
*   [
*     { input: "happy", output: "sad" },
*     { input: "tall", output: "short" },
*     { input: "energetic", output: "lethargic" },
*     { input: "sunny", output: "gloomy" },
*     { input: "windy", output: "calm" },
*   ],
*   new OpenAIEmbeddings(),
*   HNSWLib,
*   { k: 1 },
* );
*
* const dynamicPrompt = new FewShotPromptTemplate({
*   exampleSelector,
*   examplePrompt,
*   prefix: "Give the antonym of every input",
*   suffix: "Input: {adjective}\nOutput:",
*   inputVariables: ["adjective"],
* });
*
* // Format the dynamic prompt with the input 'rainy'
* console.log(await dynamicPrompt.format({ adjective: "rainy" }));
*
* ```
*/
var FewShotPromptTemplate = class FewShotPromptTemplate extends BaseStringPromptTemplate {
	lc_serializable = false;
	examples;
	exampleSelector;
	examplePrompt;
	suffix = "";
	exampleSeparator = "\n\n";
	prefix = "";
	templateFormat = "f-string";
	validateTemplate = true;
	constructor(input) {
		super(input);
		Object.assign(this, input);
		if (this.examples !== void 0 && this.exampleSelector !== void 0) throw new Error("Only one of 'examples' and 'example_selector' should be provided");
		if (this.examples === void 0 && this.exampleSelector === void 0) throw new Error("One of 'examples' and 'example_selector' should be provided");
		if (this.validateTemplate) {
			let totalInputVariables = this.inputVariables;
			if (this.partialVariables) totalInputVariables = totalInputVariables.concat(Object.keys(this.partialVariables));
			checkValidTemplate(this.prefix + this.suffix, this.templateFormat, totalInputVariables);
		}
	}
	_getPromptType() {
		return "few_shot";
	}
	static lc_name() {
		return "FewShotPromptTemplate";
	}
	async getExamples(inputVariables) {
		if (this.examples !== void 0) return this.examples;
		if (this.exampleSelector !== void 0) return this.exampleSelector.selectExamples(inputVariables);
		throw new Error("One of 'examples' and 'example_selector' should be provided");
	}
	async partial(values) {
		const newInputVariables = this.inputVariables.filter((iv) => !(iv in values));
		const newPartialVariables = {
			...this.partialVariables ?? {},
			...values
		};
		return new FewShotPromptTemplate({
			...this,
			inputVariables: newInputVariables,
			partialVariables: newPartialVariables
		});
	}
	/**
	* Formats the prompt with the given values.
	* @param values The values to format the prompt with.
	* @returns A promise that resolves to a string representing the formatted prompt.
	*/
	async format(values) {
		const allValues = await this.mergePartialAndUserVariables(values);
		const examples = await this.getExamples(allValues);
		const exampleStrings = await Promise.all(examples.map((example) => this.examplePrompt.format(example)));
		return renderTemplate([
			this.prefix,
			...exampleStrings,
			this.suffix
		].join(this.exampleSeparator), this.templateFormat, allValues);
	}
	serialize() {
		if (this.exampleSelector || !this.examples) throw new Error("Serializing an example selector is not currently supported");
		if (this.outputParser !== void 0) throw new Error("Serializing an output parser is not currently supported");
		return {
			_type: this._getPromptType(),
			input_variables: this.inputVariables,
			example_prompt: this.examplePrompt.serialize(),
			example_separator: this.exampleSeparator,
			suffix: this.suffix,
			prefix: this.prefix,
			template_format: this.templateFormat,
			examples: this.examples
		};
	}
	static async deserialize(data) {
		const { example_prompt } = data;
		if (!example_prompt) throw new Error("Missing example prompt");
		const examplePrompt = await PromptTemplate.deserialize(example_prompt);
		let examples;
		if (Array.isArray(data.examples)) examples = data.examples;
		else throw new Error("Invalid examples format. Only list or string are supported.");
		return new FewShotPromptTemplate({
			inputVariables: data.input_variables,
			examplePrompt,
			examples,
			exampleSeparator: data.example_separator,
			prefix: data.prefix,
			suffix: data.suffix,
			templateFormat: data.template_format
		});
	}
};
/**
* Chat prompt template that contains few-shot examples.
* @augments BasePromptTemplateInput
* @augments FewShotChatMessagePromptTemplateInput
*/
var FewShotChatMessagePromptTemplate = class FewShotChatMessagePromptTemplate extends BaseChatPromptTemplate {
	lc_serializable = true;
	examples;
	exampleSelector;
	examplePrompt;
	suffix = "";
	exampleSeparator = "\n\n";
	prefix = "";
	templateFormat = "f-string";
	validateTemplate = true;
	_getPromptType() {
		return "few_shot_chat";
	}
	static lc_name() {
		return "FewShotChatMessagePromptTemplate";
	}
	constructor(fields) {
		super(fields);
		this.examples = fields.examples;
		this.examplePrompt = fields.examplePrompt;
		this.exampleSeparator = fields.exampleSeparator ?? "\n\n";
		this.exampleSelector = fields.exampleSelector;
		this.prefix = fields.prefix ?? "";
		this.suffix = fields.suffix ?? "";
		this.templateFormat = fields.templateFormat ?? "f-string";
		this.validateTemplate = fields.validateTemplate ?? true;
		if (this.examples !== void 0 && this.exampleSelector !== void 0) throw new Error("Only one of 'examples' and 'example_selector' should be provided");
		if (this.examples === void 0 && this.exampleSelector === void 0) throw new Error("One of 'examples' and 'example_selector' should be provided");
		if (this.validateTemplate) {
			let totalInputVariables = this.inputVariables;
			if (this.partialVariables) totalInputVariables = totalInputVariables.concat(Object.keys(this.partialVariables));
			checkValidTemplate(this.prefix + this.suffix, this.templateFormat, totalInputVariables);
		}
	}
	async getExamples(inputVariables) {
		if (this.examples !== void 0) return this.examples;
		if (this.exampleSelector !== void 0) return this.exampleSelector.selectExamples(inputVariables);
		throw new Error("One of 'examples' and 'example_selector' should be provided");
	}
	/**
	* Formats the list of values and returns a list of formatted messages.
	* @param values The values to format the prompt with.
	* @returns A promise that resolves to a string representing the formatted prompt.
	*/
	async formatMessages(values) {
		const allValues = await this.mergePartialAndUserVariables(values);
		let examples = await this.getExamples(allValues);
		examples = examples.map((example) => {
			const result = {};
			this.examplePrompt.inputVariables.forEach((inputVariable) => {
				result[inputVariable] = example[inputVariable];
			});
			return result;
		});
		const messages = [];
		for (const example of examples) {
			const exampleMessages = await this.examplePrompt.formatMessages(example);
			messages.push(...exampleMessages);
		}
		return messages;
	}
	/**
	* Formats the prompt with the given values.
	* @param values The values to format the prompt with.
	* @returns A promise that resolves to a string representing the formatted prompt.
	*/
	async format(values) {
		const allValues = await this.mergePartialAndUserVariables(values);
		const examples = await this.getExamples(allValues);
		const exampleStrings = (await Promise.all(examples.map((example) => this.examplePrompt.formatMessages(example)))).flat().map((message) => message.content);
		return renderTemplate([
			this.prefix,
			...exampleStrings,
			this.suffix
		].join(this.exampleSeparator), this.templateFormat, allValues);
	}
	/**
	* Partially formats the prompt with the given values.
	* @param values The values to partially format the prompt with.
	* @returns A promise that resolves to an instance of `FewShotChatMessagePromptTemplate` with the given values partially formatted.
	*/
	async partial(values) {
		const newInputVariables = this.inputVariables.filter((variable) => !(variable in values));
		const newPartialVariables = {
			...this.partialVariables ?? {},
			...values
		};
		return new FewShotChatMessagePromptTemplate({
			...this,
			inputVariables: newInputVariables,
			partialVariables: newPartialVariables
		});
	}
};
//#endregion
export { FewShotChatMessagePromptTemplate, FewShotPromptTemplate };

//# sourceMappingURL=few_shot.js.map