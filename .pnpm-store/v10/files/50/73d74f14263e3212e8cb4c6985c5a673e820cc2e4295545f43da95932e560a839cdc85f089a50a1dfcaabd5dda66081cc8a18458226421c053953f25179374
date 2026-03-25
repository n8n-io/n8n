import { __export } from "../../_virtual/rolldown_runtime.js";
import { CheerioWebBaseLoader } from "./cheerio.js";
import { Document } from "@langchain/core/documents";

//#region src/document_loaders/web/hn.ts
var hn_exports = {};
__export(hn_exports, { HNLoader: () => HNLoader });
/**
* A class that extends the CheerioWebBaseLoader class. It represents a
* loader for loading web pages from the Hacker News website.
*/
var HNLoader = class extends CheerioWebBaseLoader {
	constructor(webPath) {
		super(webPath);
		this.webPath = webPath;
	}
	/**
	* An asynchronous method that loads the web page. If the webPath includes
	* "item", it calls the loadComments() method to load the comments from
	* the web page. Otherwise, it calls the loadResults() method to load the
	* results from the web page.
	* @returns A Promise that resolves to an array of Document instances.
	*/
	async load() {
		const $ = await this.scrape();
		if (this.webPath.includes("item")) return this.loadComments($);
		return this.loadResults($);
	}
	/**
	* A private method that loads the comments from the web page. It selects
	* the elements with the class "athing comtr" using the $ function
	* provided by Cheerio. It also extracts the title of the web page from
	* the element with the id "pagespace". It creates Document instances for
	* each comment, with the comment text as the page content and the source
	* and title as metadata.
	* @param $ A CheerioAPI instance.
	* @returns An array of Document instances.
	*/
	loadComments($) {
		const comments = $("tr[class='athing comtr']");
		const title = $("tr[id='pagespace']").attr("title");
		const documents = [];
		comments.each((_index, comment) => {
			const text = $(comment).text().trim();
			const metadata = {
				source: this.webPath,
				title
			};
			documents.push(new Document({
				pageContent: text,
				metadata
			}));
		});
		return documents;
	}
	/**
	* A private method that loads the results from the web page. It selects
	* the elements with the class "athing" using the $ function provided by
	* Cheerio. It extracts the ranking, link, title, and other metadata from
	* each result item. It creates Document instances for each result item,
	* with the title as the page content and the source, title, link, and
	* ranking as metadata.
	* @param $ A CheerioAPI instance.
	* @returns An array of Document instances.
	*/
	loadResults($) {
		const items = $("tr[class='athing']");
		const documents = [];
		items.each((_index, item) => {
			const ranking = $(item).find("span[class='rank']").text();
			const link = $(item).find("span[class='titleline'] a").attr("href");
			const title = $(item).find("span[class='titleline']").text().trim();
			const metadata = {
				source: this.webPath,
				title,
				link,
				ranking
			};
			documents.push(new Document({
				pageContent: title,
				metadata
			}));
		});
		return documents;
	}
};

//#endregion
export { HNLoader, hn_exports };
//# sourceMappingURL=hn.js.map