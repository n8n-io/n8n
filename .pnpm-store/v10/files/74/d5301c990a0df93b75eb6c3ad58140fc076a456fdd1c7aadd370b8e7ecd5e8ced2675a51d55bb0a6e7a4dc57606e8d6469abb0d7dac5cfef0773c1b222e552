import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader, DocumentLoader } from "@langchain/core/document_loaders/base";
import * as playwright0 from "playwright";
import { Browser, LaunchOptions, Page, Response } from "playwright";

//#region src/document_loaders/web/playwright.d.ts
type PlaywrightGotoOptions = {
  referer?: string;
  timeout?: number;
  waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
};
/**
 * Type representing a function for evaluating JavaScript code on a web
 * page using Playwright. Takes a Page, Browser, and Response object as
 * parameters and returns a Promise that resolves to a string.
 */
type PlaywrightEvaluate = (page: Page, browser: Browser, response: Response | null) => Promise<string>;
type PlaywrightWebBaseLoaderOptions = {
  launchOptions?: LaunchOptions;
  gotoOptions?: PlaywrightGotoOptions;
  evaluate?: PlaywrightEvaluate;
};
/**
 * Class representing a document loader for scraping web pages using
 * Playwright. Extends the BaseDocumentLoader class and implements the
 * DocumentLoader interface.
 */
declare class PlaywrightWebBaseLoader extends BaseDocumentLoader implements DocumentLoader {
  webPath: string;
  options: PlaywrightWebBaseLoaderOptions | undefined;
  constructor(webPath: string, options?: PlaywrightWebBaseLoaderOptions);
  static _scrape(url: string, options?: PlaywrightWebBaseLoaderOptions): Promise<string>;
  /**
   * Method that calls the _scrape method to perform the scraping of the web
   * page specified by the webPath property. Returns a Promise that resolves
   * to the scraped HTML content of the web page.
   * @returns Promise that resolves to the scraped HTML content of the web page.
   */
  scrape(): Promise<string>;
  /**
   * Method that calls the scrape method and returns the scraped HTML
   * content as a Document object. Returns a Promise that resolves to an
   * array of Document objects.
   * @returns Promise that resolves to an array of Document objects.
   */
  load(): Promise<Document[]>;
  /**
   * Static method that imports the necessary Playwright modules. Returns a
   * Promise that resolves to an object containing the imported modules.
   * @returns Promise that resolves to an object containing the imported modules.
   */
  static imports(): Promise<{
    chromium: typeof playwright0.chromium;
  }>;
}
//#endregion
export { Browser, Page, PlaywrightEvaluate, PlaywrightGotoOptions, PlaywrightWebBaseLoader, PlaywrightWebBaseLoaderOptions, Response };
//# sourceMappingURL=playwright.d.cts.map