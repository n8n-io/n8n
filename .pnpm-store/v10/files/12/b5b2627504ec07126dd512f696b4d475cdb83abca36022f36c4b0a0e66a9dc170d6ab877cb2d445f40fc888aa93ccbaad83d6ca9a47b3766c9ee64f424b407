const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_base = require('./base.cjs');
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));
const __langchain_core_output_parsers = require_rolldown_runtime.__toESM(require("@langchain/core/output_parsers"));

//#region src/chains/combine_documents/stuff.ts
/**
* Create a chain that passes a list of documents to a model.
* 
* @param llm Language model to use for responding.
* @param prompt Prompt template. Must contain input variable "context", which will be
used for passing in the formatted documents.
* @param outputParser Output parser. Defaults to `StringOutputParser`.
* @param documentPrompt Prompt used for formatting each document into a string. Input
variables can be "page_content" or any metadata keys that are in all documents.
"page_content" will automatically retrieve the `Document.page_content`, and all 
other inputs variables will be automatically retrieved from the `Document.metadata` dictionary. Default to a prompt that only contains `Document.page_content`.
* @param documentSeparator String separator to use between formatted document strings.
* @returns An LCEL `Runnable` chain.
Expects a dictionary as input with a list of `Document`s being passed under
the "context" key.
Return type depends on the `output_parser` used.
*/
async function createStuffDocumentsChain({ llm, prompt, outputParser = new __langchain_core_output_parsers.StringOutputParser(), documentPrompt = require_base.DEFAULT_DOCUMENT_PROMPT, documentSeparator = require_base.DEFAULT_DOCUMENT_SEPARATOR }) {
	if (!prompt.inputVariables.includes(require_base.DOCUMENTS_KEY)) throw new Error(`Prompt must include a "${require_base.DOCUMENTS_KEY}" variable`);
	return __langchain_core_runnables.RunnableSequence.from([
		__langchain_core_runnables.RunnablePassthrough.assign({ [require_base.DOCUMENTS_KEY]: new __langchain_core_runnables.RunnablePick(require_base.DOCUMENTS_KEY).pipe((documents, config) => require_base.formatDocuments({
			documents,
			documentPrompt,
			documentSeparator,
			config
		})) }),
		prompt,
		llm,
		outputParser
	], "stuff_documents_chain");
}

//#endregion
exports.createStuffDocumentsChain = createStuffDocumentsChain;
//# sourceMappingURL=stuff.cjs.map