import { Document, DocumentInterface } from "@langchain/core/documents";
import { BaseDocumentLoader, DocumentLoader } from "@langchain/core/document_loaders/base";
import { Browserbase, ClientOptions, LoadOptions } from "@browserbasehq/sdk";

//#region src/document_loaders/web/browserbase.d.ts
type BrowserbaseLoaderOptions = ClientOptions & LoadOptions;
/**
 * Load pre-rendered web pages using a headless browser hosted on Browserbase.
 *
 * Depends on `@browserbasehq/sdk` package.
 * Get your API key from https://browserbase.com
 *
 * @example
 * ```typescript
 * import { BrowserbaseLoader } from "@langchain/classic/document_loaders/web/browserbase";
 *
 * const loader = new BrowserbaseLoader(["https://example.com"], {
 *   apiKey: process.env.BROWSERBASE_API_KEY,
 *   textContent: true,
 * });
 *
 * const docs = await loader.load();
 * ```
 *
 * @param {string[]} urls - The URLs of the web pages to load.
 * @param {BrowserbaseLoaderOptions} [options] - Browserbase client options.
 */
declare class BrowserbaseLoader extends BaseDocumentLoader implements DocumentLoader {
  urls: string[];
  options: BrowserbaseLoaderOptions;
  browserbase: Browserbase;
  constructor(urls: string[], options?: BrowserbaseLoaderOptions);
  /**
   * Load pages from URLs.
   *
   * @returns {Promise<DocumentInterface[]>} - A promise which resolves to a list of documents.
   */
  load(): Promise<DocumentInterface[]>;
  /**
   * Load pages from URLs.
   *
   * @returns {Generator<DocumentInterface>} - A generator that yields documents.
   */
  lazyLoad(): AsyncGenerator<Document<{
    url: string;
  }>, void, unknown>;
}
//#endregion
export { BrowserbaseLoader };
//# sourceMappingURL=browserbase.d.cts.map