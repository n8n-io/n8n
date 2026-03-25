import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader, DocumentLoader } from "@langchain/core/document_loaders/base";
import { Browser, ConnectOptions, Page, PuppeteerLaunchOptions, WaitForOptions, connect, launch } from "puppeteer";

//#region src/document_loaders/web/puppeteer.d.ts
type PuppeteerGotoOptions = WaitForOptions & {
  referer?: string;
  referrerPolicy?: string;
};
/**
 * Type representing a function for evaluating JavaScript code on a web
 * page using Puppeteer. It takes a Page and Browser object as parameters
 * and returns a Promise that resolves to a string.
 */
type PuppeteerEvaluate = (page: Page, browser: Browser) => Promise<string>;
type PuppeteerWebBaseLoaderOptions = {
  launchOptions?: PuppeteerLaunchOptions & ConnectOptions;
  gotoOptions?: PuppeteerGotoOptions;
  evaluate?: PuppeteerEvaluate;
};
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
declare class PuppeteerWebBaseLoader extends BaseDocumentLoader implements DocumentLoader {
  webPath: string;
  options: PuppeteerWebBaseLoaderOptions | undefined;
  constructor(webPath: string, options?: PuppeteerWebBaseLoaderOptions);
  static _scrape(url: string, options?: PuppeteerWebBaseLoaderOptions): Promise<string>;
  /**
   * Method that calls the _scrape method to perform the scraping of the web
   * page specified by the webPath property.
   * @returns Promise that resolves to the scraped HTML content of the web page.
   */
  scrape(): Promise<string>;
  /**
   * Method that calls the scrape method and returns the scraped HTML
   * content as a Document object.
   * @returns Promise that resolves to an array of Document objects.
   */
  load(): Promise<Document[]>;
  /**
   * Static class method used to screenshot a web page and return
   * it as a {@link Document} object where  the pageContent property
   * is the screenshot encoded in base64.
   *
   * @param {string} url
   * @param {PuppeteerWebBaseLoaderOptions} options
   * @returns {Document} A document object containing the screenshot of the page encoded in base64.
   */
  static _screenshot(url: string, options?: PuppeteerWebBaseLoaderOptions): Promise<Document>;
  /**
   * Screenshot a web page and return it as a {@link Document} object where
   * the pageContent property is the screenshot encoded in base64.
   *
   * @returns {Promise<Document>} A document object containing the screenshot of the page encoded in base64.
   */
  screenshot(): Promise<Document>;
  /**
   * Static method that imports the necessary Puppeteer modules. It returns
   * a Promise that resolves to an object containing the imported modules.
   * @returns Promise that resolves to an object containing the imported Puppeteer modules.
   */
  static imports(): Promise<{
    launch: typeof launch;
    connect: typeof connect;
  }>;
}
//#endregion
export { Browser, Page, PuppeteerEvaluate, PuppeteerGotoOptions, PuppeteerWebBaseLoader, PuppeteerWebBaseLoaderOptions };
//# sourceMappingURL=puppeteer.d.cts.map