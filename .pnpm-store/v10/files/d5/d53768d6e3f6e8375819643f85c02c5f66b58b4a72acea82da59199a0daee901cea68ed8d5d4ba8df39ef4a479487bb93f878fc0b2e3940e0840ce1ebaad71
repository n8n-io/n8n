import { CheerioWebBaseLoader } from "./cheerio.cjs";
import { Document } from "@langchain/core/documents";

//#region src/document_loaders/web/college_confidential.d.ts

/**
 * A document loader specifically designed for loading documents from the
 * College Confidential website. It extends the CheerioWebBaseLoader.
 * @example
 * ```typescript
 * const loader = new CollegeConfidentialLoader("https:exampleurl.com");
 * const docs = await loader.load();
 * console.log({ docs });
 * ```
 */
declare class CollegeConfidentialLoader extends CheerioWebBaseLoader {
  constructor(webPath: string);
  /**
   * Overrides the base load() method to extract the text content from the
   * loaded document using a specific selector for the College Confidential
   * website. It creates a Document instance with the extracted text and
   * metadata, and returns an array containing the Document instance.
   * @returns An array containing a Document instance with the extracted text and metadata from the loaded College Confidential web document.
   */
  load(): Promise<Document[]>;
}
//#endregion
export { CollegeConfidentialLoader };
//# sourceMappingURL=college_confidential.d.cts.map