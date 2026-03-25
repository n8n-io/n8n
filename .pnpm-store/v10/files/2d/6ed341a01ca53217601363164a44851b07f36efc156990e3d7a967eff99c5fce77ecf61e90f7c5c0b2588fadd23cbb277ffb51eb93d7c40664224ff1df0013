import { CheerioWebBaseLoader } from "./cheerio.cjs";
import { Document } from "@langchain/core/documents";

//#region src/document_loaders/web/gitbook.d.ts

/**
 * Interface representing the parameters for configuring the
 * GitbookLoader. It has an optional property shouldLoadAllPaths, which
 * indicates whether all paths should be loaded.
 */
interface GitbookLoaderParams {
  shouldLoadAllPaths?: boolean;
}
/**
 * Class representing a document loader specifically designed for loading
 * documents from Gitbook. It extends the CheerioWebBaseLoader.
 */
declare class GitbookLoader extends CheerioWebBaseLoader {
  webPath: string;
  shouldLoadAllPaths: boolean;
  private readonly baseUrl;
  constructor(webPath: string, params?: GitbookLoaderParams);
  /**
   * Method that scrapes the web document using Cheerio and loads the
   * content based on the value of shouldLoadAllPaths. If shouldLoadAllPaths
   * is true, it calls the loadAllPaths() method to load all paths.
   * Otherwise, it calls the loadPath() method to load a single path.
   * @returns Promise resolving to an array of Document instances.
   */
  load(): Promise<Document[]>;
  /**
   * Private method that loads the content of a single path from the Gitbook
   * web document. It extracts the page content by selecting all elements
   * inside the "main" element, filters out empty text nodes, and joins the
   * remaining text nodes with line breaks. It extracts the title by
   * selecting the first "h1" element inside the "main" element. It creates
   * a Document instance with the extracted page content and metadata
   * containing the source URL and title.
   * @param $ CheerioAPI instance representing the loaded web document.
   * @param url Optional string representing the URL of the web document.
   * @returns Array of Document instances.
   */
  private loadPath;
  private loadAllPaths;
}
//#endregion
export { GitbookLoader };
//# sourceMappingURL=gitbook.d.cts.map