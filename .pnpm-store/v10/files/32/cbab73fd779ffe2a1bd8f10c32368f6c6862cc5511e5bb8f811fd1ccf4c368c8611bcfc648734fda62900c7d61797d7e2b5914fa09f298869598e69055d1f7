const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_base = require('./base.cjs');
const require_llm_chain = require('./llm_chain.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));

//#region src/chains/combine_docs_chain.ts
/**
* Chain that combines documents by stuffing into context.
* @augments BaseChain
* @augments StuffDocumentsChainInput
*/
var StuffDocumentsChain = class StuffDocumentsChain extends require_base.BaseChain {
	static lc_name() {
		return "StuffDocumentsChain";
	}
	llmChain;
	inputKey = "input_documents";
	documentVariableName = "context";
	get inputKeys() {
		return [this.inputKey, ...this.llmChain.inputKeys].filter((key) => key !== this.documentVariableName);
	}
	get outputKeys() {
		return this.llmChain.outputKeys;
	}
	constructor(fields) {
		super(fields);
		this.llmChain = fields.llmChain;
		this.documentVariableName = fields.documentVariableName ?? this.documentVariableName;
		this.inputKey = fields.inputKey ?? this.inputKey;
	}
	/** @ignore */
	_prepInputs(values) {
		if (!(this.inputKey in values)) throw new Error(`Document key ${this.inputKey} not found.`);
		const { [this.inputKey]: docs,...rest } = values;
		const texts = docs.map(({ pageContent }) => pageContent);
		const text = texts.join("\n\n");
		return {
			...rest,
			[this.documentVariableName]: text
		};
	}
	/** @ignore */
	async _call(values, runManager) {
		const result = await this.llmChain.call(this._prepInputs(values), runManager?.getChild("combine_documents"));
		return result;
	}
	_chainType() {
		return "stuff_documents_chain";
	}
	static async deserialize(data) {
		if (!data.llm_chain) throw new Error("Missing llm_chain");
		return new StuffDocumentsChain({ llmChain: await require_llm_chain.LLMChain.deserialize(data.llm_chain) });
	}
	serialize() {
		return {
			_type: this._chainType(),
			llm_chain: this.llmChain.serialize()
		};
	}
};
/**
* Combine documents by mapping a chain over them, then combining results.
* @augments BaseChain
* @augments StuffDocumentsChainInput
*/
var MapReduceDocumentsChain = class MapReduceDocumentsChain extends require_base.BaseChain {
	static lc_name() {
		return "MapReduceDocumentsChain";
	}
	llmChain;
	inputKey = "input_documents";
	documentVariableName = "context";
	returnIntermediateSteps = false;
	get inputKeys() {
		return [this.inputKey, ...this.combineDocumentChain.inputKeys];
	}
	get outputKeys() {
		return this.combineDocumentChain.outputKeys;
	}
	maxTokens = 3e3;
	maxIterations = 10;
	ensureMapStep = false;
	combineDocumentChain;
	constructor(fields) {
		super(fields);
		this.llmChain = fields.llmChain;
		this.combineDocumentChain = fields.combineDocumentChain;
		this.documentVariableName = fields.documentVariableName ?? this.documentVariableName;
		this.ensureMapStep = fields.ensureMapStep ?? this.ensureMapStep;
		this.inputKey = fields.inputKey ?? this.inputKey;
		this.maxTokens = fields.maxTokens ?? this.maxTokens;
		this.maxIterations = fields.maxIterations ?? this.maxIterations;
		this.returnIntermediateSteps = fields.returnIntermediateSteps ?? false;
	}
	/** @ignore */
	async _call(values, runManager) {
		if (!(this.inputKey in values)) throw new Error(`Document key ${this.inputKey} not found.`);
		const { [this.inputKey]: docs,...rest } = values;
		let currentDocs = docs;
		let intermediateSteps = [];
		for (let i = 0; i < this.maxIterations; i += 1) {
			const inputs = currentDocs.map((d) => ({
				[this.documentVariableName]: d.pageContent,
				...rest
			}));
			const canSkipMapStep = i !== 0 || !this.ensureMapStep;
			if (canSkipMapStep) {
				const formatted = await this.combineDocumentChain.llmChain.prompt.format(this.combineDocumentChain._prepInputs({
					[this.combineDocumentChain.inputKey]: currentDocs,
					...rest
				}));
				const length = await this.combineDocumentChain.llmChain._getNumTokens(formatted);
				const withinTokenLimit = length < this.maxTokens;
				if (withinTokenLimit) break;
			}
			const results = await this.llmChain.apply(inputs, runManager ? Array.from({ length: inputs.length }, (_, i$1) => runManager.getChild(`map_${i$1 + 1}`)) : void 0);
			const { outputKey } = this.llmChain;
			if (this.returnIntermediateSteps) intermediateSteps = intermediateSteps.concat(results.map((r) => r[outputKey]));
			currentDocs = results.map((r) => ({
				pageContent: r[outputKey],
				metadata: {}
			}));
		}
		const newInputs = {
			[this.combineDocumentChain.inputKey]: currentDocs,
			...rest
		};
		const result = await this.combineDocumentChain.call(newInputs, runManager?.getChild("combine_documents"));
		if (this.returnIntermediateSteps) return {
			...result,
			intermediateSteps
		};
		return result;
	}
	_chainType() {
		return "map_reduce_documents_chain";
	}
	static async deserialize(data) {
		if (!data.llm_chain) throw new Error("Missing llm_chain");
		if (!data.combine_document_chain) throw new Error("Missing combine_document_chain");
		return new MapReduceDocumentsChain({
			llmChain: await require_llm_chain.LLMChain.deserialize(data.llm_chain),
			combineDocumentChain: await StuffDocumentsChain.deserialize(data.combine_document_chain)
		});
	}
	serialize() {
		return {
			_type: this._chainType(),
			llm_chain: this.llmChain.serialize(),
			combine_document_chain: this.combineDocumentChain.serialize()
		};
	}
};
/**
* Combine documents by doing a first pass and then refining on more documents.
* @augments BaseChain
* @augments RefineDocumentsChainInput
*/
var RefineDocumentsChain = class RefineDocumentsChain extends require_base.BaseChain {
	static lc_name() {
		return "RefineDocumentsChain";
	}
	llmChain;
	inputKey = "input_documents";
	outputKey = "output_text";
	documentVariableName = "context";
	initialResponseName = "existing_answer";
	refineLLMChain;
	get defaultDocumentPrompt() {
		return new __langchain_core_prompts.PromptTemplate({
			inputVariables: ["page_content"],
			template: "{page_content}"
		});
	}
	documentPrompt = this.defaultDocumentPrompt;
	get inputKeys() {
		return [...new Set([
			this.inputKey,
			...this.llmChain.inputKeys,
			...this.refineLLMChain.inputKeys
		])].filter((key) => key !== this.documentVariableName && key !== this.initialResponseName);
	}
	get outputKeys() {
		return [this.outputKey];
	}
	constructor(fields) {
		super(fields);
		this.llmChain = fields.llmChain;
		this.refineLLMChain = fields.refineLLMChain;
		this.documentVariableName = fields.documentVariableName ?? this.documentVariableName;
		this.inputKey = fields.inputKey ?? this.inputKey;
		this.outputKey = fields.outputKey ?? this.outputKey;
		this.documentPrompt = fields.documentPrompt ?? this.documentPrompt;
		this.initialResponseName = fields.initialResponseName ?? this.initialResponseName;
	}
	/** @ignore */
	async _constructInitialInputs(doc, rest) {
		const baseInfo = {
			page_content: doc.pageContent,
			...doc.metadata
		};
		const documentInfo = {};
		this.documentPrompt.inputVariables.forEach((value) => {
			documentInfo[value] = baseInfo[value];
		});
		const baseInputs = { [this.documentVariableName]: await this.documentPrompt.format({ ...documentInfo }) };
		const inputs = {
			...baseInputs,
			...rest
		};
		return inputs;
	}
	/** @ignore */
	async _constructRefineInputs(doc, res) {
		const baseInfo = {
			page_content: doc.pageContent,
			...doc.metadata
		};
		const documentInfo = {};
		this.documentPrompt.inputVariables.forEach((value) => {
			documentInfo[value] = baseInfo[value];
		});
		const baseInputs = { [this.documentVariableName]: await this.documentPrompt.format({ ...documentInfo }) };
		const inputs = {
			[this.initialResponseName]: res,
			...baseInputs
		};
		return inputs;
	}
	/** @ignore */
	async _call(values, runManager) {
		if (!(this.inputKey in values)) throw new Error(`Document key ${this.inputKey} not found.`);
		const { [this.inputKey]: docs,...rest } = values;
		const currentDocs = docs;
		const initialInputs = await this._constructInitialInputs(currentDocs[0], rest);
		let res = await this.llmChain.predict({ ...initialInputs }, runManager?.getChild("answer"));
		const refineSteps = [res];
		for (let i = 1; i < currentDocs.length; i += 1) {
			const refineInputs = await this._constructRefineInputs(currentDocs[i], res);
			const inputs = {
				...refineInputs,
				...rest
			};
			res = await this.refineLLMChain.predict({ ...inputs }, runManager?.getChild("refine"));
			refineSteps.push(res);
		}
		return { [this.outputKey]: res };
	}
	_chainType() {
		return "refine_documents_chain";
	}
	static async deserialize(data) {
		const SerializedLLMChain = data.llm_chain;
		if (!SerializedLLMChain) throw new Error("Missing llm_chain");
		const SerializedRefineDocumentChain = data.refine_llm_chain;
		if (!SerializedRefineDocumentChain) throw new Error("Missing refine_llm_chain");
		return new RefineDocumentsChain({
			llmChain: await require_llm_chain.LLMChain.deserialize(SerializedLLMChain),
			refineLLMChain: await require_llm_chain.LLMChain.deserialize(SerializedRefineDocumentChain)
		});
	}
	serialize() {
		return {
			_type: this._chainType(),
			llm_chain: this.llmChain.serialize(),
			refine_llm_chain: this.refineLLMChain.serialize()
		};
	}
};

//#endregion
exports.MapReduceDocumentsChain = MapReduceDocumentsChain;
exports.RefineDocumentsChain = RefineDocumentsChain;
exports.StuffDocumentsChain = StuffDocumentsChain;
//# sourceMappingURL=combine_docs_chain.cjs.map