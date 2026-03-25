import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/airtable.d.ts
interface AirtableRequestParams {
  view?: string;
  maxRecords?: number;
  filterByFormula?: string;
  fields?: string[];
}
interface AirtableLoaderOptions {
  tableId: string;
  baseId: string;
  kwargs?: AirtableRequestParams;
}
declare class AirtableLoader extends BaseDocumentLoader {
  private readonly apiToken;
  private readonly tableId;
  private readonly baseId;
  private readonly kwargs;
  private static readonly BASE_URL;
  private asyncCaller;
  /**
   * Initializes the AirtableLoader with configuration options.
   * Retrieves the API token from environment variables and validates it.
   *
   * @param tableId - ID of the Airtable table.
   * @param baseId - ID of the Airtable base.
   * @param kwargs - Additional query parameters for Airtable requests.
   * @param config - Loader configuration for retry options.
   */
  constructor({
    tableId,
    baseId,
    kwargs
  }: AirtableLoaderOptions);
  /**
   * Loads documents from Airtable, handling pagination and retries.
   *
   * @returns A promise that resolves to an array of Document objects.
   */
  load(): Promise<Document[]>;
  /**
   * Asynchronous generator function for lazily loading documents from Airtable.
   * This method yields each document individually, enabling memory-efficient
   * handling of large datasets by fetching records in pages.
   *
   * @returns An asynchronous generator yielding Document objects one by one.
   */
  loadLazy(): AsyncGenerator<Document>;
  /**
   * Constructs the request body for an API call.
   *
   * @param offset - An optional string representing the offset for pagination.
   * @returns A record containing the combined properties of `kwargs` and the provided offset.
   */
  private constructRequestBody;
  private fetchRecords;
  /**
   * Converts an Airtable record into a Document object with metadata.
   *
   * @param record - An Airtable record to convert.
   * @returns A Document object with page content and metadata.
   */
  private createDocument;
}
//#endregion
export { AirtableLoader, AirtableLoaderOptions, AirtableRequestParams };
//# sourceMappingURL=airtable.d.cts.map