import { __export } from "../../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import FirecrawlApp from "@mendable/firecrawl-js";

//#region src/document_loaders/web/firecrawl.ts
var firecrawl_exports = {};
__export(firecrawl_exports, { FireCrawlLoader: () => FireCrawlLoader });
/**
* Class representing a document loader for loading data from
* Firecrawl (firecrawl.dev). It extends the BaseDocumentLoader class.
* @example
* ```typescript
* const loader = new FireCrawlLoader({
*   url: "{url}",
*   apiKey: "{apiKey}",
*   mode: "crawl"
* });
* const docs = await loader.load();
* ```
*/
var FireCrawlLoader = class extends BaseDocumentLoader {
	apiKey;
	apiUrl;
	url;
	mode;
	params;
	constructor(loaderParams) {
		super();
		const { apiKey = getEnvironmentVariable("FIRECRAWL_API_KEY"), apiUrl, url, mode = "crawl", params } = loaderParams;
		if (!apiKey) throw new Error("Firecrawl API key not set. You can set it as FIRECRAWL_API_KEY in your .env file, or pass it to Firecrawl.");
		this.apiKey = apiKey;
		this.apiUrl = apiUrl;
		this.url = url;
		this.mode = mode;
		this.params = params;
	}
	/**
	* Loads data from Firecrawl.
	* @returns An array of Documents representing the retrieved data.
	* @throws An error if the data could not be loaded.
	*/
	async load() {
		const params = { apiKey: this.apiKey };
		if (this.apiUrl !== void 0) params.apiUrl = this.apiUrl;
		const app = new FirecrawlApp(params);
		let firecrawlDocs;
		if (this.mode === "scrape") {
			const response = await app.scrapeUrl(this.url, this.params);
			if (!response.success) throw new Error(`Firecrawl: Failed to scrape URL. Error: ${response.error}`);
			firecrawlDocs = [response];
		} else if (this.mode === "crawl") {
			const response = await app.crawlUrl(this.url, this.params);
			if (!response.success) throw new Error(`Firecrawl: Failed to crawl URL. Error: ${response.error}`);
			firecrawlDocs = response.data;
		} else if (this.mode === "map") {
			const response = await app.mapUrl(this.url, this.params);
			if (!response.success) throw new Error(`Firecrawl: Failed to map URL. Error: ${response.error}`);
			firecrawlDocs = response.links;
			return firecrawlDocs.map((doc) => new Document({ pageContent: JSON.stringify(doc) }));
		} else throw new Error(`Unrecognized mode '${this.mode}'. Expected one of 'crawl', 'scrape'.`);
		return firecrawlDocs.map((doc) => new Document({
			pageContent: doc.markdown || doc.html || doc.rawHtml || "",
			metadata: doc.metadata || {}
		}));
	}
};

//#endregion
export { FireCrawlLoader, firecrawl_exports };
//# sourceMappingURL=firecrawl.js.map