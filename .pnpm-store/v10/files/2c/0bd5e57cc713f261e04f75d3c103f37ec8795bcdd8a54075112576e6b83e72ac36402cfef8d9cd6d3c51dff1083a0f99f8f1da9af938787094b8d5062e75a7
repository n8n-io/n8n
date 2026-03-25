const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_base = require('./base.cjs');
const __langchain_textsplitters = require_rolldown_runtime.__toESM(require("@langchain/textsplitters"));

//#region src/chains/analyze_documents_chain.ts
/**
* Chain that combines documents by stuffing into context.
* @augments BaseChain
* @augments StuffDocumentsChainInput
* @example
* ```typescript
* const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
* const combineDocsChain = loadSummarizationChain(model);
* const chain = new AnalyzeDocumentChain({
*   combineDocumentsChain: combineDocsChain,
* });
*
* // Read the text from a file (this is a placeholder for actual file reading)
* const text = readTextFromFile("state_of_the_union.txt");
*
* // Invoke the chain to analyze the document
* const res = await chain.call({
*   input_document: text,
* });
*
* console.log({ res });
* ```
*/
var AnalyzeDocumentChain = class AnalyzeDocumentChain extends require_base.BaseChain {
	static lc_name() {
		return "AnalyzeDocumentChain";
	}
	inputKey = "input_document";
	combineDocumentsChain;
	textSplitter;
	constructor(fields) {
		super(fields);
		this.combineDocumentsChain = fields.combineDocumentsChain;
		this.inputKey = fields.inputKey ?? this.inputKey;
		this.textSplitter = fields.textSplitter ?? new __langchain_textsplitters.RecursiveCharacterTextSplitter();
	}
	get inputKeys() {
		return [this.inputKey];
	}
	get outputKeys() {
		return this.combineDocumentsChain.outputKeys;
	}
	/** @ignore */
	async _call(values, runManager) {
		if (!(this.inputKey in values)) throw new Error(`Document key ${this.inputKey} not found.`);
		const { [this.inputKey]: doc,...rest } = values;
		const currentDoc = doc;
		const currentDocs = await this.textSplitter.createDocuments([currentDoc]);
		const newInputs = {
			input_documents: currentDocs,
			...rest
		};
		const result = await this.combineDocumentsChain.call(newInputs, runManager?.getChild("combine_documents"));
		return result;
	}
	_chainType() {
		return "analyze_document_chain";
	}
	static async deserialize(data, values) {
		if (!("text_splitter" in values)) throw new Error(`Need to pass in a text_splitter to deserialize AnalyzeDocumentChain.`);
		const { text_splitter } = values;
		if (!data.combine_document_chain) throw new Error(`Need to pass in a combine_document_chain to deserialize AnalyzeDocumentChain.`);
		return new AnalyzeDocumentChain({
			combineDocumentsChain: await require_base.BaseChain.deserialize(data.combine_document_chain),
			textSplitter: text_splitter
		});
	}
	serialize() {
		return {
			_type: this._chainType(),
			combine_document_chain: this.combineDocumentsChain.serialize()
		};
	}
};

//#endregion
exports.AnalyzeDocumentChain = AnalyzeDocumentChain;
//# sourceMappingURL=analyze_documents_chain.cjs.map