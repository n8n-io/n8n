import { __export } from "../../_virtual/rolldown_runtime.js";
import { AsyncCaller } from "@langchain/core/utils/async_caller";
import { JSDOM, VirtualConsole } from "jsdom";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import { isSameOrigin, validateSafeUrl } from "@langchain/core/utils/ssrf";

//#region src/document_loaders/web/recursive_url.ts
var recursive_url_exports = {};
__export(recursive_url_exports, { RecursiveUrlLoader: () => RecursiveUrlLoader });
const virtualConsole = new VirtualConsole();
virtualConsole.on("error", () => {});
var RecursiveUrlLoader = class extends BaseDocumentLoader {
	caller;
	url;
	excludeDirs;
	extractor;
	maxDepth;
	timeout;
	preventOutside;
	constructor(url, options) {
		super();
		this.caller = new AsyncCaller({
			maxConcurrency: 64,
			maxRetries: 0,
			...options.callerOptions
		});
		this.url = url;
		this.excludeDirs = options.excludeDirs ?? [];
		this.extractor = options.extractor ?? ((s) => s);
		this.maxDepth = options.maxDepth ?? 2;
		this.timeout = options.timeout ?? 1e4;
		this.preventOutside = options.preventOutside ?? true;
	}
	async fetchWithTimeout(resource, options) {
		const { timeout,...rest } = options;
		return this.caller.call(() => fetch(resource, {
			...rest,
			signal: AbortSignal.timeout(timeout)
		}));
	}
	getChildLinks(html, baseUrl) {
		const allLinks = Array.from(new JSDOM(html, { virtualConsole }).window.document.querySelectorAll("a")).map((a) => a.href);
		const absolutePaths = [];
		const invalidPrefixes = [
			"javascript:",
			"mailto:",
			"#"
		];
		const invalidSuffixes = [
			".css",
			".js",
			".ico",
			".png",
			".jpg",
			".jpeg",
			".gif",
			".svg"
		];
		for (const link of allLinks) {
			if (invalidPrefixes.some((prefix) => link.startsWith(prefix)) || invalidSuffixes.some((suffix) => link.endsWith(suffix))) continue;
			let standardizedLink;
			if (link.startsWith("http")) standardizedLink = link;
			else if (link.startsWith("//")) {
				const base = new URL(baseUrl);
				standardizedLink = base.protocol + link;
			} else standardizedLink = new URL(link, baseUrl).href;
			if (this.excludeDirs.some((exDir) => standardizedLink.startsWith(exDir))) continue;
			if (link.startsWith("http")) {
				const isAllowed = !this.preventOutside || isSameOrigin(link, baseUrl);
				if (isAllowed) absolutePaths.push(link);
			} else if (link.startsWith("//")) {
				const base = new URL(baseUrl);
				absolutePaths.push(base.protocol + link);
			} else {
				const newLink = new URL(link, baseUrl).href;
				absolutePaths.push(newLink);
			}
		}
		return Array.from(new Set(absolutePaths));
	}
	extractMetadata(rawHtml, url) {
		const metadata = { source: url };
		const { document } = new JSDOM(rawHtml, { virtualConsole }).window;
		const title = document.getElementsByTagName("title")[0];
		if (title) metadata.title = title.textContent;
		const description = document.querySelector("meta[name=description]");
		if (description) metadata.description = description.getAttribute("content");
		const html = document.getElementsByTagName("html")[0];
		if (html) metadata.language = html.getAttribute("lang");
		return metadata;
	}
	async getUrlAsDoc(url) {
		let res;
		try {
			validateSafeUrl(url, { allowHttp: true });
			res = await this.fetchWithTimeout(url, { timeout: this.timeout });
			res = await res.text();
		} catch {
			return null;
		}
		return {
			pageContent: this.extractor(res),
			metadata: this.extractMetadata(res, url)
		};
	}
	async getChildUrlsRecursive(inputUrl, visited = /* @__PURE__ */ new Set(), depth = 0) {
		if (depth >= this.maxDepth) return [];
		let url = inputUrl;
		if (!inputUrl.endsWith("/")) url += "/";
		const isExcluded = this.excludeDirs.some((exDir) => url.startsWith(exDir));
		if (isExcluded) return [];
		let res;
		try {
			await validateSafeUrl(url, { allowHttp: true });
			res = await this.fetchWithTimeout(url, { timeout: this.timeout });
			res = await res.text();
		} catch {
			return [];
		}
		const childUrls = this.getChildLinks(res, url);
		const results = await Promise.all(childUrls.map((childUrl) => (async () => {
			if (visited.has(childUrl)) return null;
			visited.add(childUrl);
			const childDoc = await this.getUrlAsDoc(childUrl);
			if (!childDoc) return null;
			if (childUrl.endsWith("/")) {
				const childUrlResponses = await this.getChildUrlsRecursive(childUrl, visited, depth + 1);
				return [childDoc, ...childUrlResponses];
			}
			return [childDoc];
		})()));
		return results.flat().filter((docs) => docs !== null);
	}
	async load() {
		const rootDoc = await this.getUrlAsDoc(this.url);
		if (!rootDoc) return [];
		const docs = [rootDoc];
		docs.push(...await this.getChildUrlsRecursive(this.url, new Set([this.url])));
		return docs;
	}
};

//#endregion
export { RecursiveUrlLoader, recursive_url_exports };
//# sourceMappingURL=recursive_url.js.map