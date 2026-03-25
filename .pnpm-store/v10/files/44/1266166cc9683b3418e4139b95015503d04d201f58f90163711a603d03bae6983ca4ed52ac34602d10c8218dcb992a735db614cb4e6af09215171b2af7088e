import { __export } from "../../_virtual/rolldown_runtime.js";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/puppeteer.ts
var puppeteer_exports = {};
__export(puppeteer_exports, { PuppeteerWebBaseLoader: () => PuppeteerWebBaseLoader });
/**
* Class that extends the BaseDocumentLoader class and implements the
* DocumentLoader interface. It represents a document loader for scraping
* web pages using Puppeteer.
* @example
* ```typescript
* const loader = new PuppeteerWebBaseLoader("https:exampleurl.com", {
*   launchOptions: {
*     headless: true,
*   },
*   gotoOptions: {
*     waitUntil: "domcontentloaded",
*   },
* });
* const screenshot = await loader.screenshot();
* ```
*/
var PuppeteerWebBaseLoader = class PuppeteerWebBaseLoader extends BaseDocumentLoader {
	options;
	constructor(webPath, options) {
		super();
		this.webPath = webPath;
		this.options = options ?? void 0;
	}
	static async _scrape(url, options) {
		const { launch, connect } = await PuppeteerWebBaseLoader.imports();
		let browser;
		if (options?.launchOptions?.browserWSEndpoint) browser = await connect({ browserWSEndpoint: options?.launchOptions?.browserWSEndpoint });
		else browser = await launch({
			headless: true,
			defaultViewport: null,
			ignoreDefaultArgs: ["--disable-extensions"],
			...options?.launchOptions
		});
		const page = await browser.newPage();
		await page.goto(url, {
			timeout: 18e4,
			waitUntil: "domcontentloaded",
			...options?.gotoOptions
		});
		const bodyHTML = options?.evaluate ? await options?.evaluate(page, browser) : await page.evaluate(() => document.body.innerHTML);
		await browser.close();
		return bodyHTML;
	}
	/**
	* Method that calls the _scrape method to perform the scraping of the web
	* page specified by the webPath property.
	* @returns Promise that resolves to the scraped HTML content of the web page.
	*/
	async scrape() {
		return PuppeteerWebBaseLoader._scrape(this.webPath, this.options);
	}
	/**
	* Method that calls the scrape method and returns the scraped HTML
	* content as a Document object.
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
	* Static class method used to screenshot a web page and return
	* it as a {@link Document} object where  the pageContent property
	* is the screenshot encoded in base64.
	*
	* @param {string} url
	* @param {PuppeteerWebBaseLoaderOptions} options
	* @returns {Document} A document object containing the screenshot of the page encoded in base64.
	*/
	static async _screenshot(url, options) {
		const { launch, connect } = await PuppeteerWebBaseLoader.imports();
		let browser;
		if (options?.launchOptions?.browserWSEndpoint) browser = await connect({ browserWSEndpoint: options?.launchOptions?.browserWSEndpoint });
		else browser = await launch({
			headless: true,
			defaultViewport: null,
			ignoreDefaultArgs: ["--disable-extensions"],
			...options?.launchOptions
		});
		const page = await browser.newPage();
		await page.goto(url, {
			timeout: 18e4,
			waitUntil: "domcontentloaded",
			...options?.gotoOptions
		});
		const screenshot = await page.screenshot();
		const base64 = screenshot.toString("base64");
		const metadata = { source: url };
		return new Document({
			pageContent: base64,
			metadata
		});
	}
	/**
	* Screenshot a web page and return it as a {@link Document} object where
	* the pageContent property is the screenshot encoded in base64.
	*
	* @returns {Promise<Document>} A document object containing the screenshot of the page encoded in base64.
	*/
	async screenshot() {
		return PuppeteerWebBaseLoader._screenshot(this.webPath, this.options);
	}
	/**
	* Static method that imports the necessary Puppeteer modules. It returns
	* a Promise that resolves to an object containing the imported modules.
	* @returns Promise that resolves to an object containing the imported Puppeteer modules.
	*/
	static async imports() {
		try {
			const { launch, connect } = await import("puppeteer");
			return {
				launch,
				connect
			};
		} catch (e) {
			console.error(e);
			throw new Error("Please install puppeteer as a dependency with, e.g. `pnpm install puppeteer`");
		}
	}
};

//#endregion
export { PuppeteerWebBaseLoader, puppeteer_exports };
//# sourceMappingURL=puppeteer.js.map