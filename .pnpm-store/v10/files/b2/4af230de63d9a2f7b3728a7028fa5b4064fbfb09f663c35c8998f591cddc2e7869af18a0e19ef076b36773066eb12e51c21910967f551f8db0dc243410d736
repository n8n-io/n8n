import { __export } from "../../_virtual/rolldown_runtime.js";
import { AsyncCaller } from "@langchain/core/utils/async_caller";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/cheerio.ts
var cheerio_exports = {};
__export(cheerio_exports, { CheerioWebBaseLoader: () => CheerioWebBaseLoader });
/**
* A class that extends the BaseDocumentLoader and implements the
* DocumentLoader interface. It represents a document loader for loading
* web-based documents using Cheerio.
* @example
* ```typescript
* const loader = new CheerioWebBaseLoader("https://exampleurl.com");
* const docs = await loader.load();
* console.log({ docs });
* ```
*/
var CheerioWebBaseLoader = class CheerioWebBaseLoader extends BaseDocumentLoader {
	timeout;
	caller;
	selector;
	textDecoder;
	headers;
	constructor(webPath, fields) {
		super();
		this.webPath = webPath;
		const { timeout, selector, textDecoder, headers,...rest } = fields ?? {};
		this.timeout = timeout ?? 1e4;
		this.caller = new AsyncCaller(rest);
		this.selector = selector ?? "body";
		this.textDecoder = textDecoder;
		this.headers = headers;
	}
	/**
	* Fetches web documents from the given array of URLs and loads them using Cheerio.
	* It returns an array of CheerioAPI instances.
	* @param urls An array of URLs to fetch and load.
	* @returns A Promise that resolves to an array of CheerioAPI instances.
	*/
	static async scrapeAll(urls, caller, timeout, textDecoder, options) {
		return Promise.all(urls.map((url) => CheerioWebBaseLoader._scrape(url, caller, timeout, textDecoder, options)));
	}
	static async _scrape(url, caller, timeout, textDecoder, options) {
		const { headers,...cheerioOptions } = options ?? {};
		const { load } = await CheerioWebBaseLoader.imports();
		const response = await caller.call(fetch, url, {
			signal: timeout ? AbortSignal.timeout(timeout) : void 0,
			headers
		});
		const html = textDecoder?.decode(await response.arrayBuffer()) ?? await response.text();
		return load(html, cheerioOptions);
	}
	/**
	* Fetches the web document from the webPath and loads it using Cheerio.
	* It returns a CheerioAPI instance.
	* @returns A Promise that resolves to a CheerioAPI instance.
	*/
	async scrape() {
		const options = { headers: this.headers };
		return CheerioWebBaseLoader._scrape(this.webPath, this.caller, this.timeout, this.textDecoder, options);
	}
	/**
	* Extracts the text content from the loaded document using the selector
	* and creates a Document instance with the extracted text and metadata.
	* It returns an array of Document instances.
	* @returns A Promise that resolves to an array of Document instances.
	*/
	async load() {
		const $ = await this.scrape();
		const title = $("title").text();
		const text = $(this.selector).text();
		const metadata = {
			source: this.webPath,
			title
		};
		return [new Document({
			pageContent: text,
			metadata
		})];
	}
	/**
	* A static method that dynamically imports the Cheerio library and
	* returns the load function. If the import fails, it throws an error.
	* @returns A Promise that resolves to an object containing the load function from the Cheerio library.
	*/
	static async imports() {
		try {
			const { load } = await import("cheerio");
			return { load };
		} catch (e) {
			console.error(e);
			throw new Error("Please install cheerio as a dependency with, e.g. `pnpm install cheerio`");
		}
	}
};

//#endregion
export { CheerioWebBaseLoader, cheerio_exports };
//# sourceMappingURL=cheerio.js.map