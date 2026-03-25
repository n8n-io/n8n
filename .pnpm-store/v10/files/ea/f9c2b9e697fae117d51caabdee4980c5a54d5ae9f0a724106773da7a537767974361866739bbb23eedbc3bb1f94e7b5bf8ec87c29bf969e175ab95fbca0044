const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __mozilla_readability = require_rolldown_runtime.__toESM(require("@mozilla/readability"));
const jsdom = require_rolldown_runtime.__toESM(require("jsdom"));

//#region src/document_transformers/mozilla_readability.ts
var mozilla_readability_exports = {};
require_rolldown_runtime.__export(mozilla_readability_exports, { MozillaReadabilityTransformer: () => MozillaReadabilityTransformer });
/**
* A transformer that uses the Mozilla Readability library to extract the
* main content from a web page.
* @example
* ```typescript
* const loader = new HTMLWebBaseLoader("https://example.com/article");
* const docs = await loader.load();
*
* const splitter = new RecursiveCharacterTextSplitter({
*  maxCharacterCount: 5000,
* });
* const transformer = new MozillaReadabilityTransformer();
*
* // The sequence processes the loaded documents through the splitter and then the transformer.
* const sequence = transformer.pipe(splitter);
*
* // Invoke the sequence to transform the documents into a more readable format.
* const newDocuments = await sequence.invoke(docs);
*
* console.log(newDocuments);
* ```
*/
var MozillaReadabilityTransformer = class extends __langchain_core_documents.MappingDocumentTransformer {
	static lc_name() {
		return "MozillaReadabilityTransformer";
	}
	constructor(options = {}) {
		super(options);
		this.options = options;
	}
	async _transformDocument(document) {
		const doc = new jsdom.JSDOM(document.pageContent);
		const readability = new __mozilla_readability.Readability(doc.window.document, this.options);
		const result = readability.parse();
		return new __langchain_core_documents.Document({
			pageContent: result?.textContent ?? "",
			metadata: { ...document.metadata }
		});
	}
};

//#endregion
exports.MozillaReadabilityTransformer = MozillaReadabilityTransformer;
Object.defineProperty(exports, 'mozilla_readability_exports', {
  enumerable: true,
  get: function () {
    return mozilla_readability_exports;
  }
});
//# sourceMappingURL=mozilla_readability.cjs.map