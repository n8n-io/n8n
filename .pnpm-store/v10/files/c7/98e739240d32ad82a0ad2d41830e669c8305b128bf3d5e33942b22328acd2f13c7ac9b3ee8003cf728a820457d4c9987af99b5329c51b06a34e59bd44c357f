import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/searchapi.d.ts
type JSONPrimitive = string | number | boolean | null;
type JSONValue = JSONPrimitive | JSONObject | JSONArray;
interface JSONObject {
  [key: string]: JSONValue;
}
interface JSONArray extends Array<JSONValue> {}
/**
 * SearchApiParameters Type Definition.
 *
 * For more parameters and supported search engines, refer specific engine documentation:
 * Google - https://www.searchapi.io/docs/google
 * Google News - https://www.searchapi.io/docs/google-news
 * Google Scholar - https://www.searchapi.io/docs/google-scholar
 * YouTube Transcripts - https://www.searchapi.io/docs/youtube-transcripts
 * and others.
 *
 */
type SearchApiParameters = {
  [key: string]: JSONValue;
};
/**
 * Class representing a document loader for loading search results from
 * the SearchApi. It extends the BaseDocumentLoader class.
 * @example
 * ```typescript
 * const loader = new SearchApiLoader({
 *   q: "{query}",
 *   apiKey: "{apiKey}",
 *   engine: "google",
 * });
 * const docs = await loader.load();
 * ```
 */
declare class SearchApiLoader extends BaseDocumentLoader {
  private apiKey;
  private parameters;
  constructor(params: SearchApiParameters);
  /**
   * Builds the URL for the SearchApi search request.
   * @returns The URL for the search request.
   */
  buildUrl(): string;
  /**
   * Extracts documents from the provided output.
   * @param output - The output to extract documents from.
   * @param responseType - The type of the response to extract documents from.
   * @returns An array of Documents.
   */
  private extractDocuments;
  /**
   * Processes the response data from the SearchApi search request and converts it into an array of Documents.
   * @param data - The response data from the SearchApi search request.
   * @returns An array of Documents.
   */
  processResponseData(data: Record<string, unknown>): Document[];
  private fetchData;
  /**
   * Loads the search results from the SearchApi.
   * @returns An array of Documents representing the search results.
   * @throws An error if the search results could not be loaded.
   */
  load(): Promise<Document[]>;
}
//#endregion
export { SearchApiLoader };
//# sourceMappingURL=searchapi.d.ts.map