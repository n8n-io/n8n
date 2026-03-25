import { PromptTemplate } from "@langchain/core/prompts";

//#region src/chains/combine_documents/base.ts
const DEFAULT_DOCUMENT_SEPARATOR = "\n\n";
const DOCUMENTS_KEY = "context";
const DEFAULT_DOCUMENT_PROMPT = /* @__PURE__ */ PromptTemplate.fromTemplate("{page_content}");
async function formatDocuments({ documentPrompt, documentSeparator, documents, config }) {
	if (documents == null || documents.length === 0) return "";
	const formattedDocs = await Promise.all(documents.map((document) => documentPrompt.withConfig({ runName: "document_formatter" }).invoke({
		...document.metadata,
		page_content: document.pageContent
	}, config)));
	return formattedDocs.join(documentSeparator);
}

//#endregion
export { DEFAULT_DOCUMENT_PROMPT, DEFAULT_DOCUMENT_SEPARATOR, DOCUMENTS_KEY, formatDocuments };
//# sourceMappingURL=base.js.map