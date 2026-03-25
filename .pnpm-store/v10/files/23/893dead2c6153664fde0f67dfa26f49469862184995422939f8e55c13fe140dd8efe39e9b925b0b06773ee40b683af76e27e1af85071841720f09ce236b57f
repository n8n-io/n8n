const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_document_loaders_web_cheerio = require('./cheerio.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));

//#region src/document_loaders/web/gitbook.ts
var gitbook_exports = {};
require_rolldown_runtime.__export(gitbook_exports, { GitbookLoader: () => GitbookLoader });
/**
* Class representing a document loader specifically designed for loading
* documents from Gitbook. It extends the CheerioWebBaseLoader.
*/
var GitbookLoader = class GitbookLoader extends require_document_loaders_web_cheerio.CheerioWebBaseLoader {
	shouldLoadAllPaths = false;
	baseUrl;
	constructor(webPath, params = {}) {
		const path = params.shouldLoadAllPaths === true ? `${webPath}/sitemap.xml` : webPath;
		super(path);
		this.webPath = webPath;
		this.baseUrl = webPath;
		this.webPath = path;
		this.shouldLoadAllPaths = params.shouldLoadAllPaths ?? this.shouldLoadAllPaths;
	}
	/**
	* Method that scrapes the web document using Cheerio and loads the
	* content based on the value of shouldLoadAllPaths. If shouldLoadAllPaths
	* is true, it calls the loadAllPaths() method to load all paths.
	* Otherwise, it calls the loadPath() method to load a single path.
	* @returns Promise resolving to an array of Document instances.
	*/
	async load() {
		const $ = await this.scrape();
		if (this.shouldLoadAllPaths === true) return this.loadAllPaths($);
		return this.loadPath($);
	}
	/**
	* Private method that loads the content of a single path from the Gitbook
	* web document. It extracts the page content by selecting all elements
	* inside the "main" element, filters out empty text nodes, and joins the
	* remaining text nodes with line breaks. It extracts the title by
	* selecting the first "h1" element inside the "main" element. It creates
	* a Document instance with the extracted page content and metadata
	* containing the source URL and title.
	* @param $ CheerioAPI instance representing the loaded web document.
	* @param url Optional string representing the URL of the web document.
	* @returns Array of Document instances.
	*/
	loadPath($, url) {
		const pageContent = $("main *").contents().toArray().map((element) => element.type === "text" ? $(element).text().trim() : null).filter((text) => text).join("\n");
		const title = $("main h1").first().text().trim();
		return [new __langchain_core_documents.Document({
			pageContent,
			metadata: {
				source: url ?? this.webPath,
				title
			}
		})];
	}
	/**
	* Private method that loads the content of all paths from the Gitbook web
	* document. It extracts the URLs of all paths from the "loc" elements in
	* the sitemap.xml. It iterates over each URL, scrapes the web document
	* using the _scrape() method, and calls the loadPath() method to load the
	* content of each path. It collects all the loaded documents and returns
	* them as an array.
	* @param $ CheerioAPI instance representing the loaded web document.
	* @returns Promise resolving to an array of Document instances.
	*/
	async loadAllPaths($) {
		const urls = $("loc").toArray().map((element) => $(element).text());
		const documents = [];
		for (const url of urls) {
			const buildUrl = url.includes(this.baseUrl) ? url : this.baseUrl + url;
			console.log(`Fetching text from ${buildUrl}`);
			const html = await GitbookLoader._scrape(buildUrl, this.caller, this.timeout);
			documents.push(...this.loadPath(html, buildUrl));
		}
		console.log(`Fetched ${documents.length} documents.`);
		return documents;
	}
};

//#endregion
exports.GitbookLoader = GitbookLoader;
Object.defineProperty(exports, 'gitbook_exports', {
  enumerable: true,
  get: function () {
    return gitbook_exports;
  }
});
//# sourceMappingURL=gitbook.cjs.map