import { __export } from "../../_virtual/rolldown_runtime.js";
import { CheerioWebBaseLoader } from "./cheerio.js";
import { Document } from "@langchain/core/documents";

//#region src/document_loaders/web/imsdb.ts
var imsdb_exports = {};
__export(imsdb_exports, { IMSDBLoader: () => IMSDBLoader });
/**
* A class that extends the CheerioWebBaseLoader class. It represents a
* loader for loading web pages from the IMSDB (Internet Movie Script
* Database) website.
*/
var IMSDBLoader = class extends CheerioWebBaseLoader {
	constructor(webPath) {
		super(webPath);
		this.webPath = webPath;
	}
	/**
	* An asynchronous method that loads the web page using the scrape()
	* method inherited from the base class. It selects the element with the
	* class 'scrtext' using the $ function provided by Cheerio and extracts
	* the text content. It creates a Document instance with the text content
	* as the page content and the source as metadata. It returns an array
	* containing the Document instance.
	* @returns An array containing a Document instance.
	*/
	async load() {
		const $ = await this.scrape();
		const text = $("td[class='scrtext']").text().trim();
		const metadata = { source: this.webPath };
		return [new Document({
			pageContent: text,
			metadata
		})];
	}
};

//#endregion
export { IMSDBLoader, imsdb_exports };
//# sourceMappingURL=imsdb.js.map