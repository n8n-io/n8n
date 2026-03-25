const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const html_to_text = require_rolldown_runtime.__toESM(require("html-to-text"));
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));

//#region src/document_transformers/html_to_text.ts
var html_to_text_exports = {};
require_rolldown_runtime.__export(html_to_text_exports, { HtmlToTextTransformer: () => HtmlToTextTransformer });
/**
* A transformer that converts HTML content to plain text.
* @example
* ```typescript
* const loader = new CheerioWebBaseLoader("https://example.com/some-page");
* const docs = await loader.load();
*
* const splitter = new RecursiveCharacterTextSplitter({
*  maxCharacterCount: 1000,
* });
* const transformer = new HtmlToTextTransformer();
*
* // The sequence of text splitting followed by HTML to text transformation
* const sequence = splitter.pipe(transformer);
*
* // Processing the loaded documents through the sequence
* const newDocuments = await sequence.invoke(docs);
*
* console.log(newDocuments);
* ```
*/
var HtmlToTextTransformer = class extends __langchain_core_documents.MappingDocumentTransformer {
	static lc_name() {
		return "HtmlToTextTransformer";
	}
	constructor(options = {}) {
		super(options);
		this.options = options;
	}
	async _transformDocument(document) {
		const extractedContent = (0, html_to_text.htmlToText)(document.pageContent, this.options);
		return new __langchain_core_documents.Document({
			pageContent: extractedContent,
			metadata: { ...document.metadata }
		});
	}
};

//#endregion
exports.HtmlToTextTransformer = HtmlToTextTransformer;
Object.defineProperty(exports, 'html_to_text_exports', {
  enumerable: true,
  get: function () {
    return html_to_text_exports;
  }
});
//# sourceMappingURL=html_to_text.cjs.map