import { DocumentInterface } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/firecrawl.d.ts

/**
 * Interface representing the parameters for the Firecrawl loader. It
 * includes properties such as the URL to scrape or crawl and the API key.
 */
interface FirecrawlLoaderParameters {
  /**
   * URL to scrape or crawl
   */
  url: string;
  /**
   * API key for Firecrawl. If not provided, the default value is the value of the FIRECRAWL_API_KEY environment variable.
   */
  apiKey?: string;
  /**
   * API URL for Firecrawl.
   */
  apiUrl?: string;
  /**
   * Mode of operation. Can be "crawl", "scrape", or "map". If not provided, the default value is "crawl".
   */
  mode?: "crawl" | "scrape" | "map";
  params?: Record<string, unknown>;
}
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
declare class FireCrawlLoader extends BaseDocumentLoader {
  private apiKey;
  private apiUrl?;
  private url;
  private mode;
  private params?;
  constructor(loaderParams: FirecrawlLoaderParameters);
  /**
   * Loads data from Firecrawl.
   * @returns An array of Documents representing the retrieved data.
   * @throws An error if the data could not be loaded.
   */
  load(): Promise<DocumentInterface[]>;
}
//#endregion
export { FireCrawlLoader };
//# sourceMappingURL=firecrawl.d.ts.map