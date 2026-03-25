import { BaseChain } from "./base.js";
import { difference, intersection, union } from "../util/set.js";

//#region src/chains/sequential_chain.ts
function formatSet(input) {
	return Array.from(input).map((i) => `"${i}"`).join(", ");
}
/**
* Chain where the outputs of one chain feed directly into next.
* @example
* ```typescript
* const promptTemplate = new PromptTemplate({
*   template: `You are a playwright. Given the title of play and the era it is set in, it is your job to write a synopsis for that title.
* Title: {title}
* Era: {era}
* Playwright: This is a synopsis for the above play:`,
*   inputVariables: ["title", "era"],
* });

* const reviewPromptTemplate = new PromptTemplate({
*   template: `You are a play critic from the New York Times. Given the synopsis of play, it is your job to write a review for that play.
*   
*     Play Synopsis:
*     {synopsis}
*     Review from a New York Times play critic of the above play:`,
*   inputVariables: ["synopsis"],
* });

* const overallChain = new SequentialChain({
*   chains: [
*     new LLMChain({
*       llm: new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
*       prompt: promptTemplate,
*       outputKey: "synopsis",
*     }),
*     new LLMChain({
*       llm: new OpenAI({ model: "gpt-4o-mini", temperature: 0 }),
*       prompt: reviewPromptTemplate,
*       outputKey: "review",
*     }),
*   ],
*   inputVariables: ["era", "title"],
*   outputVariables: ["synopsis", "review"],
*   verbose: true,
* });

* const chainExecutionResult = await overallChain.call({
*   title: "Tragedy at sunset on the beach",
*   era: "Victorian England",
* });
* console.log(chainExecutionResult);
* ```
*/
var SequentialChain = class SequentialChain extends BaseChain {
	static lc_name() {
		return "SequentialChain";
	}
	chains;
	inputVariables;
	outputVariables;
	returnAll;
	get inputKeys() {
		return this.inputVariables;
	}
	get outputKeys() {
		return this.outputVariables;
	}
	constructor(fields) {
		super(fields);
		this.chains = fields.chains;
		this.inputVariables = fields.inputVariables;
		this.outputVariables = fields.outputVariables ?? [];
		if (this.outputVariables.length > 0 && fields.returnAll) throw new Error("Either specify variables to return using `outputVariables` or use `returnAll` param. Cannot apply both conditions at the same time.");
		this.returnAll = fields.returnAll ?? false;
		this._validateChains();
	}
	/** @ignore */
	_validateChains() {
		if (this.chains.length === 0) throw new Error("Sequential chain must have at least one chain.");
		const memoryKeys = this.memory?.memoryKeys ?? [];
		const inputKeysSet = new Set(this.inputKeys);
		const memoryKeysSet = new Set(memoryKeys);
		const keysIntersection = intersection(inputKeysSet, memoryKeysSet);
		if (keysIntersection.size > 0) throw new Error(`The following keys: ${formatSet(keysIntersection)} are overlapping between memory and input keys of the chain variables. This can lead to unexpected behaviour. Please use input and memory keys that don't overlap.`);
		const availableKeys = union(inputKeysSet, memoryKeysSet);
		for (const chain of this.chains) {
			let missingKeys = difference(new Set(chain.inputKeys), availableKeys);
			if (chain.memory) missingKeys = difference(missingKeys, new Set(chain.memory.memoryKeys));
			if (missingKeys.size > 0) throw new Error(`Missing variables for chain "${chain._chainType()}": ${formatSet(missingKeys)}. Only got the following variables: ${formatSet(availableKeys)}.`);
			const outputKeysSet = new Set(chain.outputKeys);
			const overlappingOutputKeys = intersection(availableKeys, outputKeysSet);
			if (overlappingOutputKeys.size > 0) throw new Error(`The following output variables for chain "${chain._chainType()}" are overlapping: ${formatSet(overlappingOutputKeys)}. This can lead to unexpected behaviour.`);
			for (const outputKey of outputKeysSet) availableKeys.add(outputKey);
		}
		if (this.outputVariables.length === 0) if (this.returnAll) {
			const outputKeys = difference(availableKeys, inputKeysSet);
			this.outputVariables = Array.from(outputKeys);
		} else this.outputVariables = this.chains[this.chains.length - 1].outputKeys;
		else {
			const missingKeys = difference(new Set(this.outputVariables), new Set(availableKeys));
			if (missingKeys.size > 0) throw new Error(`The following output variables were expected to be in the final chain output but were not found: ${formatSet(missingKeys)}.`);
		}
	}
	/** @ignore */
	async _call(values, runManager) {
		let input = {};
		const allChainValues = values;
		let i = 0;
		for (const chain of this.chains) {
			i += 1;
			input = await chain.call(allChainValues, runManager?.getChild(`step_${i}`));
			for (const key of Object.keys(input)) allChainValues[key] = input[key];
		}
		const output = {};
		for (const key of this.outputVariables) output[key] = allChainValues[key];
		return output;
	}
	_chainType() {
		return "sequential_chain";
	}
	static async deserialize(data) {
		const chains = [];
		const inputVariables = data.input_variables;
		const outputVariables = data.output_variables;
		const serializedChains = data.chains;
		for (const serializedChain of serializedChains) {
			const deserializedChain = await BaseChain.deserialize(serializedChain);
			chains.push(deserializedChain);
		}
		return new SequentialChain({
			chains,
			inputVariables,
			outputVariables
		});
	}
	serialize() {
		const chains = [];
		for (const chain of this.chains) chains.push(chain.serialize());
		return {
			_type: this._chainType(),
			input_variables: this.inputVariables,
			output_variables: this.outputVariables,
			chains
		};
	}
};
/**
* Simple chain where a single string output of one chain is fed directly into the next.
* @augments BaseChain
* @augments SimpleSequentialChainInput
*
* @example
* ```ts
* import { SimpleSequentialChain, LLMChain } from "@langchain/classic/chains";
* import { OpenAI } from "langchain/llms/openai";
* import { PromptTemplate } from "langchain/prompts";
*
* // This is an LLMChain to write a synopsis given a title of a play.
* const llm = new OpenAI({ temperature: 0 });
* const template = `You are a playwright. Given the title of play, it is your job to write a synopsis for that title.
*
* Title: {title}
* Playwright: This is a synopsis for the above play:`
* const promptTemplate = new PromptTemplate({ template, inputVariables: ["title"] });
* const synopsisChain = new LLMChain({ llm, prompt: promptTemplate });
*
*
* // This is an LLMChain to write a review of a play given a synopsis.
* const reviewLLM = new OpenAI({ temperature: 0 })
* const reviewTemplate = `You are a play critic from the New York Times. Given the synopsis of play, it is your job to write a review for that play.
*
* Play Synopsis:
* {synopsis}
* Review from a New York Times play critic of the above play:`
* const reviewPromptTemplate = new PromptTemplate({ template: reviewTemplate, inputVariables: ["synopsis"] });
* const reviewChain = new LLMChain({ llm: reviewLLM, prompt: reviewPromptTemplate });
*
* const overallChain = new SimpleSequentialChain({chains: [synopsisChain, reviewChain], verbose:true})
* const review = await overallChain.run("Tragedy at sunset on the beach")
* // the variable review contains resulting play review.
* ```
*/
var SimpleSequentialChain = class SimpleSequentialChain extends BaseChain {
	static lc_name() {
		return "SimpleSequentialChain";
	}
	chains;
	inputKey = "input";
	outputKey = "output";
	trimOutputs;
	get inputKeys() {
		return [this.inputKey];
	}
	get outputKeys() {
		return [this.outputKey];
	}
	constructor(fields) {
		super(fields);
		this.chains = fields.chains;
		this.trimOutputs = fields.trimOutputs ?? false;
		this._validateChains();
	}
	/** @ignore */
	_validateChains() {
		for (const chain of this.chains) {
			if (chain.inputKeys.filter((k) => !chain.memory?.memoryKeys.includes(k)).length !== 1) throw new Error(`Chains used in SimpleSequentialChain should all have one input, got ${chain.inputKeys.length} for ${chain._chainType()}.`);
			if (chain.outputKeys.length !== 1) throw new Error(`Chains used in SimpleSequentialChain should all have one output, got ${chain.outputKeys.length} for ${chain._chainType()}.`);
		}
	}
	/** @ignore */
	async _call(values, runManager) {
		let input = values[this.inputKey];
		let i = 0;
		for (const chain of this.chains) {
			i += 1;
			input = (await chain.call({
				[chain.inputKeys[0]]: input,
				signal: values.signal
			}, runManager?.getChild(`step_${i}`)))[chain.outputKeys[0]];
			if (this.trimOutputs) input = input.trim();
			await runManager?.handleText(input);
		}
		return { [this.outputKey]: input };
	}
	_chainType() {
		return "simple_sequential_chain";
	}
	static async deserialize(data) {
		const chains = [];
		const serializedChains = data.chains;
		for (const serializedChain of serializedChains) {
			const deserializedChain = await BaseChain.deserialize(serializedChain);
			chains.push(deserializedChain);
		}
		return new SimpleSequentialChain({ chains });
	}
	serialize() {
		const chains = [];
		for (const chain of this.chains) chains.push(chain.serialize());
		return {
			_type: this._chainType(),
			chains
		};
	}
};

//#endregion
export { SequentialChain, SimpleSequentialChain };
//# sourceMappingURL=sequential_chain.js.map