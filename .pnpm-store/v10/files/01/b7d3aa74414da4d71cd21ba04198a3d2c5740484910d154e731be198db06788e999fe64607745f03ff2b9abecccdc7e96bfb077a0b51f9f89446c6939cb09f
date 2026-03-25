import { __export } from "../_virtual/rolldown_runtime.js";
import { Document, MappingDocumentTransformer } from "@langchain/core/documents";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

//#region src/document_transformers/mozilla_readability.ts
var mozilla_readability_exports = {};
__export(mozilla_readability_exports, { MozillaReadabilityTransformer: () => MozillaReadabilityTransformer });
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
var MozillaReadabilityTransformer = class extends MappingDocumentTransformer {
	static lc_name() {
		return "MozillaReadabilityTransformer";
	}
	constructor(options = {}) {
		super(options);
		this.options = options;
	}
	async _transformDocument(document) {
		const doc = new JSDOM(document.pageContent);
		const readability = new Readability(doc.window.document, this.options);
		const result = readability.parse();
		return new Document({
			pageContent: result?.textContent ?? "",
			metadata: { ...document.metadata }
		});
	}
};

//#endregion
export { MozillaReadabilityTransformer, mozilla_readability_exports };
//# sourceMappingURL=mozilla_readability.js.map