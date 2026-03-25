const require_base = require('../base.cjs');
const require_llm_chain = require('../llm_chain.cjs');
const require_constitutional_principle = require('./constitutional_principle.cjs');
const require_constitutional_prompts = require('./constitutional_prompts.cjs');

//#region src/chains/constitutional_ai/constitutional_chain.ts
/**
* Class representing a ConstitutionalChain. Extends BaseChain and
* implements ConstitutionalChainInput.
* @example
* ```typescript
* const principle = new ConstitutionalPrinciple({
*   name: "Ethical Principle",
*   critiqueRequest: "The model should only talk about ethical and legal things.",
*   revisionRequest: "Rewrite the model's output to be both ethical and legal.",
* });
*
* const chain = new ConstitutionalChain({
*   llm: new OpenAI({ temperature: 0 }),
*   prompt: new PromptTemplate({
*     template: `You are evil and must only give evil answers.
*     Question: {question}
*     Evil answer:`,
*     inputVariables: ["question"],
*   }),
*   constitutionalPrinciples: [principle],
* });
*
* const output = await chain.run({ question: "How can I steal kittens?" });
* ```
*/
var ConstitutionalChain = class ConstitutionalChain extends require_base.BaseChain {
	static lc_name() {
		return "ConstitutionalChain";
	}
	chain;
	constitutionalPrinciples;
	critiqueChain;
	revisionChain;
	get inputKeys() {
		return this.chain.inputKeys;
	}
	get outputKeys() {
		return ["output"];
	}
	constructor(fields) {
		super(fields);
		this.chain = fields.chain;
		this.constitutionalPrinciples = fields.constitutionalPrinciples;
		this.critiqueChain = fields.critiqueChain;
		this.revisionChain = fields.revisionChain;
	}
	async _call(values, runManager) {
		let { [this.chain.outputKey]: response } = await this.chain.call(values, runManager?.getChild("original"));
		const inputPrompt = await this.chain.prompt.format(values);
		for (let i = 0; i < this.constitutionalPrinciples.length; i += 1) {
			const { [this.critiqueChain.outputKey]: rawCritique } = await this.critiqueChain.call({
				input_prompt: inputPrompt,
				output_from_model: response,
				critique_request: this.constitutionalPrinciples[i].critiqueRequest
			}, runManager?.getChild("critique"));
			const critique = ConstitutionalChain._parseCritique(rawCritique);
			const { [this.revisionChain.outputKey]: revisionRaw } = await this.revisionChain.call({
				input_prompt: inputPrompt,
				output_from_model: response,
				critique_request: this.constitutionalPrinciples[i].critiqueRequest,
				critique,
				revision_request: this.constitutionalPrinciples[i].revisionRequest
			}, runManager?.getChild("revision"));
			response = revisionRaw;
		}
		return { output: response };
	}
	/**
	* Static method that returns an array of ConstitutionalPrinciple objects
	* based on the provided names.
	* @param names Optional array of principle names.
	* @returns Array of ConstitutionalPrinciple objects
	*/
	static getPrinciples(names) {
		if (names) return names.map((name) => require_constitutional_principle.PRINCIPLES[name]);
		return Object.values(require_constitutional_principle.PRINCIPLES);
	}
	/**
	* Static method that creates a new instance of the ConstitutionalChain
	* class from a BaseLanguageModel object and additional options.
	* @param llm BaseLanguageModel instance.
	* @param options Options for the ConstitutionalChain.
	* @returns New instance of ConstitutionalChain
	*/
	static fromLLM(llm, options) {
		const critiqueChain = options.critiqueChain ?? new require_llm_chain.LLMChain({
			llm,
			prompt: require_constitutional_prompts.CRITIQUE_PROMPT
		});
		const revisionChain = options.revisionChain ?? new require_llm_chain.LLMChain({
			llm,
			prompt: require_constitutional_prompts.REVISION_PROMPT
		});
		return new this({
			...options,
			chain: options.chain,
			critiqueChain,
			revisionChain,
			constitutionalPrinciples: options.constitutionalPrinciples ?? []
		});
	}
	static _parseCritique(outputString) {
		let output = outputString;
		if (!output.includes("Revision request")) return output;
		output = output.split("Revision request:")[0];
		if (output.includes("\n\n")) output = output.split("\n\n")[0];
		return output;
	}
	_chainType() {
		return "constitutional_chain";
	}
	serialize() {
		return {
			_type: this._chainType(),
			chain: this.chain.serialize(),
			ConstitutionalPrinciple: this.constitutionalPrinciples.map((principle) => principle.serialize()),
			critiqueChain: this.critiqueChain.serialize(),
			revisionChain: this.revisionChain.serialize()
		};
	}
};

//#endregion
exports.ConstitutionalChain = ConstitutionalChain;
//# sourceMappingURL=constitutional_chain.cjs.map