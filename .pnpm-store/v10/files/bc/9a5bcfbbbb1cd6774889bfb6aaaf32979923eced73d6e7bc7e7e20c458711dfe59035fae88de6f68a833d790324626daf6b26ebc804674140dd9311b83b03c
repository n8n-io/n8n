import { __export } from "../../_virtual/rolldown_runtime.js";
import { CheerioWebBaseLoader } from "./cheerio.js";
import { Document } from "@langchain/core/documents";
import { chunkArray } from "@langchain/core/utils/chunk_array";

//#region src/document_loaders/web/sitemap.ts
var sitemap_exports = {};
__export(sitemap_exports, { SitemapLoader: () => SitemapLoader });
const DEFAULT_CHUNK_SIZE = 300;
var SitemapLoader = class extends CheerioWebBaseLoader {
	allowUrlPatterns;
	chunkSize;
	constructor(webPath, params = {}) {
		const paramsWithDefaults = {
			chunkSize: DEFAULT_CHUNK_SIZE,
			...params
		};
		let path = webPath.endsWith("/") ? webPath.slice(0, -1) : webPath;
		path = path.endsWith(".xml") ? path : `${path}/sitemap.xml`;
		super(path, paramsWithDefaults);
		this.webPath = webPath;
		this.webPath = path;
		this.allowUrlPatterns = paramsWithDefaults.filterUrls;
		this.chunkSize = paramsWithDefaults.chunkSize;
	}
	_checkUrlPatterns(url) {
		if (!this.allowUrlPatterns) return false;
		return !this.allowUrlPatterns.some((pattern) => !new RegExp(pattern).test(url));
	}
	async parseSitemap() {
		const $ = await CheerioWebBaseLoader._scrape(this.webPath, this.caller, this.timeout, this.textDecoder, {
			xmlMode: true,
			xml: true
		});
		const elements = [];
		$("url").each((_, element) => {
			const loc = $(element).find("loc").text();
			if (!loc) return;
			if (this._checkUrlPatterns(loc)) return;
			const changefreq = $(element).find("changefreq").text();
			const lastmod = $(element).find("lastmod").text();
			const priority = $(element).find("priority").text();
			elements.push({
				loc,
				changefreq,
				lastmod,
				priority
			});
		});
		$("sitemap").each((_, element) => {
			const loc = $(element).find("loc").text();
			if (!loc) return;
			const changefreq = $(element).find("changefreq").text();
			const lastmod = $(element).find("lastmod").text();
			const priority = $(element).find("priority").text();
			elements.push({
				loc,
				changefreq,
				lastmod,
				priority
			});
		});
		return elements;
	}
	async _loadSitemapUrls(elements) {
		const all = await CheerioWebBaseLoader.scrapeAll(elements.map((ele) => ele.loc), this.caller, this.timeout, this.textDecoder);
		const documents = all.map(($, i) => {
			if (!elements[i]) throw new Error("Scraped docs and elements not in sync");
			const text = $(this.selector).text();
			const { loc: source,...metadata } = elements[i];
			const description = $("meta[name='description']").attr("content");
			const title = $("meta[property='og:title']").attr("content");
			const lang = $("meta[property='og:locale']").attr("content");
			return new Document({
				pageContent: text,
				metadata: {
					...metadata,
					description,
					title,
					lang,
					source: source.trim()
				}
			});
		});
		return documents;
	}
	async load() {
		const elements = await this.parseSitemap();
		const chunks = chunkArray(elements, this.chunkSize);
		const documents = [];
		for await (const chunk of chunks) {
			const chunkedDocuments = await this._loadSitemapUrls(chunk);
			documents.push(...chunkedDocuments);
		}
		return documents;
	}
};

//#endregion
export { SitemapLoader, sitemap_exports };
//# sourceMappingURL=sitemap.js.map