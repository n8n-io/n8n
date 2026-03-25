import { CheerioWebBaseLoader } from "./cheerio.cjs";
import { Document } from "@langchain/core/documents";

//#region src/document_loaders/web/imsdb.d.ts

/**
 * A class that extends the CheerioWebBaseLoader class. It represents a
 * loader for loading web pages from the IMSDB (Internet Movie Script
 * Database) website.
 */
declare class IMSDBLoader extends CheerioWebBaseLoader {
  webPath: string;
  constructor(webPath: string);
  /**
   * An asynchronous method that loads the web page using the scrape()
   * method inherited from the base class. It selects the element with the
   * class 'scrtext' using the $ function provided by Cheerio and extracts
   * the text content. It creates a Document instance with the text content
   * as the page content and the source as metadata. It returns an array
   * containing the Document instance.
   * @returns An array containing a Document instance.
   */
  load(): Promise<Document[]>;
}
//#endregion
export { IMSDBLoader };
//# sourceMappingURL=imsdb.d.cts.map