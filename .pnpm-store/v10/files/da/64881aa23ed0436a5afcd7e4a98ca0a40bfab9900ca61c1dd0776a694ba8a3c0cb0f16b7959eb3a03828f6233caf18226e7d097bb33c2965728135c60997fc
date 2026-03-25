const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_document_loaders_web_cheerio = require('./cheerio.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));

//#region src/document_loaders/web/college_confidential.ts
var college_confidential_exports = {};
require_rolldown_runtime.__export(college_confidential_exports, { CollegeConfidentialLoader: () => CollegeConfidentialLoader });
/**
* A document loader specifically designed for loading documents from the
* College Confidential website. It extends the CheerioWebBaseLoader.
* @example
* ```typescript
* const loader = new CollegeConfidentialLoader("https:exampleurl.com");
* const docs = await loader.load();
* console.log({ docs });
* ```
*/
var CollegeConfidentialLoader = class extends require_document_loaders_web_cheerio.CheerioWebBaseLoader {
	constructor(webPath) {
		super(webPath);
	}
	/**
	* Overrides the base load() method to extract the text content from the
	* loaded document using a specific selector for the College Confidential
	* website. It creates a Document instance with the extracted text and
	* metadata, and returns an array containing the Document instance.
	* @returns An array containing a Document instance with the extracted text and metadata from the loaded College Confidential web document.
	*/
	async load() {
		const $ = await this.scrape();
		const text = $("main[class='skin-handler']").text();
		const metadata = { source: this.webPath };
		return [new __langchain_core_documents.Document({
			pageContent: text,
			metadata
		})];
	}
};

//#endregion
exports.CollegeConfidentialLoader = CollegeConfidentialLoader;
Object.defineProperty(exports, 'college_confidential_exports', {
  enumerable: true,
  get: function () {
    return college_confidential_exports;
  }
});
//# sourceMappingURL=college_confidential.cjs.map