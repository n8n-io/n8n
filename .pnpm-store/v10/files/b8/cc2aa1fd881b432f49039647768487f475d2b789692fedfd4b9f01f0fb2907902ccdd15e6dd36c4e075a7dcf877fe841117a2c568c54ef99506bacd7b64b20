import { AsyncCaller } from "@langchain/core/utils/async_caller";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import { APIResponseError, Client, isFullBlock, isFullDatabase, isFullPage } from "@notionhq/client";
import * as _notionhq_client_build_src_api_endpoints0 from "@notionhq/client/build/src/api-endpoints";

//#region src/document_loaders/web/notionapi.d.ts
type GuardType<T> = T extends ((x: any, ...rest: any) => x is infer U) ? U : never;
type GetBlockResponse = Parameters<typeof isFullBlock>[0];
type GetPageResponse = Parameters<typeof isFullPage>[0];
type GetDatabaseResponse = Parameters<typeof isFullDatabase>[0];
type BlockObjectResponse = GuardType<typeof isFullBlock>;
type PageObjectResponse = GuardType<typeof isFullPage>;
type DatabaseObjectResponse = GuardType<typeof isFullDatabase>;
type GetResponse = GetBlockResponse | GetPageResponse | GetDatabaseResponse | APIResponseError;
type PagePropertiesType = PageObjectResponse["properties"];
type PagePropertiesValue = PagePropertiesType[keyof PagePropertiesType];
declare const isPageResponse: (res: GetResponse) => res is _notionhq_client_build_src_api_endpoints0.DatabaseObjectResponse | _notionhq_client_build_src_api_endpoints0.PageObjectResponse | _notionhq_client_build_src_api_endpoints0.PartialBlockObjectResponse | _notionhq_client_build_src_api_endpoints0.PartialDatabaseObjectResponse | _notionhq_client_build_src_api_endpoints0.PartialPageObjectResponse | _notionhq_client_build_src_api_endpoints0.BlockObjectResponse;
declare const isDatabaseResponse: (res: GetResponse) => res is _notionhq_client_build_src_api_endpoints0.DatabaseObjectResponse | _notionhq_client_build_src_api_endpoints0.PageObjectResponse | _notionhq_client_build_src_api_endpoints0.PartialBlockObjectResponse | _notionhq_client_build_src_api_endpoints0.PartialDatabaseObjectResponse | _notionhq_client_build_src_api_endpoints0.PartialPageObjectResponse | _notionhq_client_build_src_api_endpoints0.BlockObjectResponse;
declare const isErrorResponse: (res: GetResponse) => res is APIResponseError;
declare const isPage: (res: GetResponse) => res is _notionhq_client_build_src_api_endpoints0.PageObjectResponse;
declare const isDatabase: (res: GetResponse) => res is _notionhq_client_build_src_api_endpoints0.DatabaseObjectResponse;
type OnDocumentLoadedCallback = (current: number, total: number, currentTitle?: string, rootTitle?: string) => void;
type NotionAPILoaderOptions = {
  clientOptions: ConstructorParameters<typeof Client>[0];
  id: string;
  callerOptions?: ConstructorParameters<typeof AsyncCaller>[0];
  onDocumentLoaded?: OnDocumentLoadedCallback;
  propertiesAsHeader?: boolean;
};
/**
 * A class that extends the BaseDocumentLoader class. It represents a
 * document loader for loading documents from Notion using the Notion API.
 * @example
 * ```typescript
 * const pageLoader = new NotionAPILoader({
 *   clientOptions: { auth: "<NOTION_INTEGRATION_TOKEN>" },
 *   id: "<PAGE_ID>",
 *   type: "page",
 * });
 * const pageDocs = await pageLoader.load();
 * const splitDocs = await splitter.splitDocuments(pageDocs);
 *
 * const dbLoader = new NotionAPILoader({
 *   clientOptions: { auth: "<NOTION_INTEGRATION_TOKEN>" },
 *   id: "<DATABASE_ID>",
 *   type: "database",
 *   propertiesAsHeader: true,
 * });
 * const dbDocs = await dbLoader.load();
 * ```
 */
declare class NotionAPILoader extends BaseDocumentLoader {
  private caller;
  private notionClient;
  private n2mClient;
  private id;
  private pageQueue;
  private pageCompleted;
  pageQueueTotal: number;
  private documents;
  private rootTitle;
  private onDocumentLoaded;
  private propertiesAsHeader;
  constructor(options: NotionAPILoaderOptions);
  /**
   * Adds a selection of page ids to the pageQueue and removes duplicates.
   * @param items An array of string ids
   */
  private addToQueue;
  /**
   * Parses a Notion GetResponse object (page or database) and returns a string of the title.
   * @param obj The Notion GetResponse object to parse.
   * @returns The string of the title.
   */
  private getTitle;
  /**
   * Parses the property type and returns a string
   * @param page The Notion page property to parse.
   * @returns A string of parsed property.
   */
  private getPropValue;
  /**
   * Parses the properties of a Notion page and returns them as key-value
   * pairs.
   * @param page The Notion page to parse.
   * @returns An object containing the parsed properties as key-value pairs.
   */
  private parsePageProperties;
  /**
   * Parses the details of a Notion page and returns them as an object.
   * @param page The Notion page to parse.
   * @returns An object containing the parsed details of the page.
   */
  private parsePageDetails;
  private loadBlock;
  private loadBlocks;
  private loadPage;
  private loadDatabase;
  /**
   * Loads the documents from Notion based on the specified options.
   * @returns A Promise that resolves to an array of Documents.
   */
  load(): Promise<Document[]>;
}
//#endregion
export { BlockObjectResponse, DatabaseObjectResponse, GetBlockResponse, GetDatabaseResponse, GetPageResponse, GetResponse, NotionAPILoader, NotionAPILoaderOptions, OnDocumentLoadedCallback, PageObjectResponse, PagePropertiesType, PagePropertiesValue, isDatabase, isDatabaseResponse, isErrorResponse, isPage, isPageResponse };
//# sourceMappingURL=notionapi.d.ts.map