import { __export } from "../../_virtual/rolldown_runtime.js";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/playwright.ts
var playwright_exports = {};
__export(playwright_exports, { PlaywrightWebBaseLoader: () => PlaywrightWebBaseLoader });
/**
* Class representing a document loader for scraping web pages using
* Playwright. Extends the BaseDocumentLoader class and implements the
* DocumentLoader interface.
*/
var PlaywrightWebBaseLoader = class PlaywrightWebBaseLoader extends BaseDocumentLoader {
	options;
	constructor(webPath, options) {
		super();
		this.webPath = webPath;
		this.options = options ?? void 0;
	}
	static async _scrape(url, options) {
		const { chromium } = await PlaywrightWebBaseLoader.imports();
		const browser = await chromium.launch({
			headless: true,
			...options?.launchOptions
		});
		const page = await browser.newPage();
		const response = await page.goto(url, {
			timeout: 18e4,
			waitUntil: "domcontentloaded",
			...options?.gotoOptions
		});
		const bodyHTML = options?.evaluate ? await options?.evaluate(page, browser, response) : await page.content();
		await browser.close();
		return bodyHTML;
	}
	/**
	* Method that calls the _scrape method to perform the scraping of the web
	* page specified by the webPath property. Returns a Promise that resolves
	* to the scraped HTML content of the web page.
	* @returns Promise that resolves to the scraped HTML content of the web page.
	*/
	async scrape() {
		return PlaywrightWebBaseLoader._scrape(this.webPath, this.options);
	}
	/**
	* Method that calls the scrape method and returns the scraped HTML
	* content as a Document object. Returns a Promise that resolves to an
	* array of Document objects.
	* @returns Promise that resolves to an array of Document objects.
	*/
	async load() {
		const text = await this.scrape();
		const metadata = { source: this.webPath };
		return [new Document({
			pageContent: text,
			metadata
		})];
	}
	/**
	* Static method that imports the necessary Playwright modules. Returns a
	* Promise that resolves to an object containing the imported modules.
	* @returns Promise that resolves to an object containing the imported modules.
	*/
	static async imports() {
		try {
			const { chromium } = await import("playwright");
			return { chromium };
		} catch (e) {
			console.error(e);
			throw new Error("Please install playwright as a dependency with, e.g. `pnpm install playwright`");
		}
	}
};

//#endregion
export { PlaywrightWebBaseLoader, playwright_exports };
//# sourceMappingURL=playwright.js.map