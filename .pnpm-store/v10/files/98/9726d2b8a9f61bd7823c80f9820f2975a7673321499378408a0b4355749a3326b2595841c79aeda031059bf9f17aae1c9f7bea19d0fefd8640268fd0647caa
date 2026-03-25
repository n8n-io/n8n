import { BaseExampleSelector } from "./base.js";
//#region src/example_selectors/length_based.ts
/**
* Calculates the length of a text based on the number of words and lines.
*/
function getLengthBased(text) {
	return text.split(/\n| /).length;
}
/**
* A specialized example selector that selects examples based on their
* length, ensuring that the total length of the selected examples does
* not exceed a specified maximum length.
* @example
* ```typescript
* const exampleSelector = new LengthBasedExampleSelector(
*   [
*     { input: "happy", output: "sad" },
*     { input: "tall", output: "short" },
*     { input: "energetic", output: "lethargic" },
*     { input: "sunny", output: "gloomy" },
*     { input: "windy", output: "calm" },
*   ],
*   {
*     examplePrompt: new PromptTemplate({
*       inputVariables: ["input", "output"],
*       template: "Input: {input}\nOutput: {output}",
*     }),
*     maxLength: 25,
*   },
* );
* const dynamicPrompt = new FewShotPromptTemplate({
*   exampleSelector,
*   examplePrompt: new PromptTemplate({
*     inputVariables: ["input", "output"],
*     template: "Input: {input}\nOutput: {output}",
*   }),
*   prefix: "Give the antonym of every input",
*   suffix: "Input: {adjective}\nOutput:",
*   inputVariables: ["adjective"],
* });
* console.log(dynamicPrompt.format({ adjective: "big" }));
* console.log(
*   dynamicPrompt.format({
*     adjective:
*       "big and huge and massive and large and gigantic and tall and much much much much much bigger than everything else",
*   }),
* );
* ```
*/
var LengthBasedExampleSelector = class LengthBasedExampleSelector extends BaseExampleSelector {
	examples = [];
	examplePrompt;
	getTextLength = getLengthBased;
	maxLength = 2048;
	exampleTextLengths = [];
	constructor(data) {
		super(data);
		this.examplePrompt = data.examplePrompt;
		this.maxLength = data.maxLength ?? 2048;
		this.getTextLength = data.getTextLength ?? getLengthBased;
	}
	/**
	* Adds an example to the list of examples and calculates its length.
	* @param example The example to be added.
	* @returns Promise that resolves when the example has been added and its length calculated.
	*/
	async addExample(example) {
		this.examples.push(example);
		const stringExample = await this.examplePrompt.format(example);
		this.exampleTextLengths.push(this.getTextLength(stringExample));
	}
	/**
	* Calculates the lengths of the examples.
	* @param v Array of lengths of the examples.
	* @param values Instance of LengthBasedExampleSelector.
	* @returns Promise that resolves with an array of lengths of the examples.
	*/
	async calculateExampleTextLengths(v, values) {
		if (v.length > 0) return v;
		const { examples, examplePrompt } = values;
		return (await Promise.all(examples.map((eg) => examplePrompt.format(eg)))).map((eg) => this.getTextLength(eg));
	}
	/**
	* Selects examples until the total length of the selected examples
	* reaches the maxLength.
	* @param inputVariables The input variables for the examples.
	* @returns Promise that resolves with an array of selected examples.
	*/
	async selectExamples(inputVariables) {
		const inputs = Object.values(inputVariables).join(" ");
		let remainingLength = this.maxLength - this.getTextLength(inputs);
		let i = 0;
		const examples = [];
		while (remainingLength > 0 && i < this.examples.length) {
			const newLength = remainingLength - this.exampleTextLengths[i];
			if (newLength < 0) break;
			else {
				examples.push(this.examples[i]);
				remainingLength = newLength;
			}
			i += 1;
		}
		return examples;
	}
	/**
	* Creates a new instance of LengthBasedExampleSelector and adds a list of
	* examples to it.
	* @param examples Array of examples to be added.
	* @param args Input parameters for the LengthBasedExampleSelector.
	* @returns Promise that resolves with a new instance of LengthBasedExampleSelector with the examples added.
	*/
	static async fromExamples(examples, args) {
		const selector = new LengthBasedExampleSelector(args);
		await Promise.all(examples.map((eg) => selector.addExample(eg)));
		return selector;
	}
};
//#endregion
export { LengthBasedExampleSelector };

//# sourceMappingURL=length_based.js.map