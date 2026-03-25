const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));

//#region src/chains/combine_documents/base.ts
const DEFAULT_DOCUMENT_SEPARATOR = "\n\n";
const DOCUMENTS_KEY = "context";
const DEFAULT_DOCUMENT_PROMPT = /* @__PURE__ */ __langchain_core_prompts.PromptTemplate.fromTemplate("{page_content}");
async function formatDocuments({ documentPrompt, documentSeparator, documents, config }) {
	if (documents == null || documents.length === 0) return "";
	const formattedDocs = await Promise.all(documents.map((document) => documentPrompt.withConfig({ runName: "document_formatter" }).invoke({
		...document.metadata,
		page_content: document.pageContent
	}, config)));
	return formattedDocs.join(documentSeparator);
}

//#endregion
exports.DEFAULT_DOCUMENT_PROMPT = DEFAULT_DOCUMENT_PROMPT;
exports.DEFAULT_DOCUMENT_SEPARATOR = DEFAULT_DOCUMENT_SEPARATOR;
exports.DOCUMENTS_KEY = DOCUMENTS_KEY;
exports.formatDocuments = formatDocuments;
//# sourceMappingURL=base.cjs.map