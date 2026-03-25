import { CheerioWebBaseLoader } from "./cheerio.cjs";
import { Document } from "@langchain/core/documents";

//#region src/document_loaders/web/hn.d.ts

/**
 * A class that extends the CheerioWebBaseLoader class. It represents a
 * loader for loading web pages from the Hacker News website.
 */
declare class HNLoader extends CheerioWebBaseLoader {
  webPath: string;
  constructor(webPath: string);
  /**
   * An asynchronous method that loads the web page. If the webPath includes
   * "item", it calls the loadComments() method to load the comments from
   * the web page. Otherwise, it calls the loadResults() method to load the
   * results from the web page.
   * @returns A Promise that resolves to an array of Document instances.
   */
  load(): Promise<Document[]>;
  /**
   * A private method that loads the comments from the web page. It selects
   * the elements with the class "athing comtr" using the $ function
   * provided by Cheerio. It also extracts the title of the web page from
   * the element with the id "pagespace". It creates Document instances for
   * each comment, with the comment text as the page content and the source
   * and title as metadata.
   * @param $ A CheerioAPI instance.
   * @returns An array of Document instances.
   */
  private loadComments;
  /**
   * A private method that loads the results from the web page. It selects
   * the elements with the class "athing" using the $ function provided by
   * Cheerio. It extracts the ranking, link, title, and other metadata from
   * each result item. It creates Document instances for each result item,
   * with the title as the page content and the source, title, link, and
   * ranking as metadata.
   * @param $ A CheerioAPI instance.
   * @returns An array of Document instances.
   */
  private loadResults;
}
//#endregion
export { HNLoader };
//# sourceMappingURL=hn.d.cts.map