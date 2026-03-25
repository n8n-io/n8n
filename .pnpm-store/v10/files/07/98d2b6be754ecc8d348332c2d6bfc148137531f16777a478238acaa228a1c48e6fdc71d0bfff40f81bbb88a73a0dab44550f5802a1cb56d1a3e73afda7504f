import { DocumentInterface } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/spider.d.ts

/**
 * Interface representing the parameters for the Spider loader. It
 * includes properties such as the URL to scrape or crawl and the API key.
 */
interface SpiderLoaderParameters {
  /**
   * URL to scrape or crawl
   */
  url: string;
  /**
   * API key for Spider. If not provided, the default value is the value of the SPIDER_API_KEY environment variable.
   */
  apiKey?: string;
  /**
   * Mode of operation. Can be either "crawl" or "scrape". If not provided, the default value is "scrape".
   */
  mode?: "crawl" | "scrape";
  params?: Record<string, unknown>;
}
/**
 * Class representing a document loader for loading data from
 * Spider (spider.cloud). It extends the BaseDocumentLoader class.
 * @example
 * ```typescript
 * const loader = new SpiderLoader({
 *   url: "{url}",
 *   apiKey: "{apiKey}",
 *   mode: "crawl"
 * });
 * const docs = await loader.load();
 * ```
 */
declare class SpiderLoader extends BaseDocumentLoader {
  private apiKey;
  private url;
  private mode;
  private params?;
  constructor(loaderParams: SpiderLoaderParameters);
  /**
   * Loads the data from the Spider.
   * @returns An array of Documents representing the retrieved data.
   * @throws An error if the data could not be loaded.
   */
  load(): Promise<DocumentInterface[]>;
}
//#endregion
export { SpiderLoader };
//# sourceMappingURL=spider.d.cts.map