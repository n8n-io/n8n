import { Runnable } from "../runnables/base.js";
//#region src/prompts/base.ts
/**
* Base class for prompt templates. Exposes a format method that returns a
* string prompt given a set of input values.
*/
var BasePromptTemplate = class extends Runnable {
	lc_serializable = true;
	lc_namespace = [
		"langchain_core",
		"prompts",
		this._getPromptType()
	];
	get lc_attributes() {
		return { partialVariables: void 0 };
	}
	inputVariables;
	outputParser;
	partialVariables;
	/**
	* Metadata to be used for tracing.
	*/
	metadata;
	/** Tags to be used for tracing. */
	tags;
	constructor(input) {
		super(input);
		const { inputVariables } = input;
		if (inputVariables.includes("stop")) throw new Error("Cannot have an input variable named 'stop', as it is used internally, please rename.");
		Object.assign(this, input);
	}
	/**
	* Merges partial variables and user variables.
	* @param userVariables The user variables to merge with the partial variables.
	* @returns A Promise that resolves to an object containing the merged variables.
	*/
	async mergePartialAndUserVariables(userVariables) {
		const partialVariables = this.partialVariables ?? {};
		const partialValues = {};
		for (const [key, value] of Object.entries(partialVariables)) if (typeof value === "string") partialValues[key] = value;
		else partialValues[key] = await value();
		return {
			...partialValues,
			...userVariables
		};
	}
	/**
	* Invokes the prompt template with the given input and options.
	* @param input The input to invoke the prompt template with.
	* @param options Optional configuration for the callback.
	* @returns A Promise that resolves to the output of the prompt template.
	*/
	async invoke(input, options) {
		const metadata = {
			...this.metadata,
			...options?.metadata
		};
		const tags = [...this.tags ?? [], ...options?.tags ?? []];
		return this._callWithConfig((input) => this.formatPromptValue(input), input, {
			...options,
			tags,
			metadata,
			runType: "prompt"
		});
	}
};
//#endregion
export { BasePromptTemplate };

//# sourceMappingURL=base.js.map