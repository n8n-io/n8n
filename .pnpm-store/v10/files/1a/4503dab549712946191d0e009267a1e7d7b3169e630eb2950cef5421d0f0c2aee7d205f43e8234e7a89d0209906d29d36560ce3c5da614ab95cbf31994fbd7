const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_tagging = require('../chains/openai_functions/tagging.cjs');
require('../chains/openai_functions/index.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_utils_json_schema = require_rolldown_runtime.__toESM(require("@langchain/core/utils/json_schema"));
const __langchain_openai = require_rolldown_runtime.__toESM(require("@langchain/openai"));

//#region src/document_transformers/openai_functions.ts
var openai_functions_exports = {};
require_rolldown_runtime.__export(openai_functions_exports, {
	MetadataTagger: () => MetadataTagger,
	createMetadataTagger: () => createMetadataTagger,
	createMetadataTaggerFromZod: () => createMetadataTaggerFromZod
});
/**
* A transformer that tags metadata to a document using a tagging chain.
*/
var MetadataTagger = class extends __langchain_core_documents.MappingDocumentTransformer {
	static lc_name() {
		return "MetadataTagger";
	}
	taggingChain;
	constructor(fields) {
		super();
		this.taggingChain = fields.taggingChain;
		if (this.taggingChain.inputKeys.length !== 1) throw new Error("Invalid input chain. The input chain must have exactly one input.");
		if (this.taggingChain.outputKeys.length !== 1) throw new Error("Invalid input chain. The input chain must have exactly one output.");
	}
	async _transformDocument(document) {
		const taggingChainResponse = await this.taggingChain.call({ [this.taggingChain.inputKeys[0]]: document.pageContent });
		const extractedMetadata = taggingChainResponse[this.taggingChain.outputKeys[0]];
		return new __langchain_core_documents.Document({
			pageContent: document.pageContent,
			metadata: {
				...extractedMetadata,
				...document.metadata
			}
		});
	}
};
function createMetadataTagger(schema, options) {
	const { llm = new __langchain_openai.ChatOpenAI({ model: "gpt-3.5-turbo-0613" }),...rest } = options;
	const taggingChain = require_tagging.createTaggingChain(schema, llm, rest);
	return new MetadataTagger({ taggingChain });
}
function createMetadataTaggerFromZod(schema, options) {
	return createMetadataTagger((0, __langchain_core_utils_json_schema.toJsonSchema)(schema), options);
}

//#endregion
exports.MetadataTagger = MetadataTagger;
exports.createMetadataTagger = createMetadataTagger;
exports.createMetadataTaggerFromZod = createMetadataTaggerFromZod;
Object.defineProperty(exports, 'openai_functions_exports', {
  enumerable: true,
  get: function () {
    return openai_functions_exports;
  }
});
//# sourceMappingURL=openai_functions.cjs.map