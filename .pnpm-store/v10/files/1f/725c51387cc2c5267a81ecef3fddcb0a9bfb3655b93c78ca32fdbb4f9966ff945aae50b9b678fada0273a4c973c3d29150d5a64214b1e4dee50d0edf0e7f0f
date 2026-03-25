import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/confluence.d.ts

/**
 * Interface representing the parameters for configuring the
 * ConfluencePagesLoader.
 */
interface ConfluencePagesLoaderParams {
  baseUrl: string;
  spaceKey: string;
  username?: string;
  accessToken?: string;
  personalAccessToken?: string;
  limit?: number;
  expand?: string;
  maxRetries?: number;
}
/**
 * Interface representing a Confluence page.
 */
interface ConfluencePage {
  id: string;
  title: string;
  type: string;
  body: {
    storage: {
      value: string;
    };
  };
  status: string;
  version?: {
    number: number;
    when: string;
    by: {
      displayName: string;
    };
  };
}
/**
 * Interface representing the response from the Confluence API.
 */
interface ConfluenceAPIResponse {
  size: number;
  results: ConfluencePage[];
}
/**
 * Class representing a document loader for loading pages from Confluence.
 * @example
 * ```typescript
 * const loader = new ConfluencePagesLoader({
 *   baseUrl: "https:
 *   spaceKey: "~EXAMPLE362906de5d343d49dcdbae5dEXAMPLE",
 *   username: "your-username",
 *   accessToken: "your-access-token",
 * });
 * const documents = await loader.load();
 * console.log(documents);
 * ```
 */
declare class ConfluencePagesLoader extends BaseDocumentLoader {
  readonly baseUrl: string;
  readonly spaceKey: string;
  readonly username?: string;
  readonly accessToken?: string;
  readonly limit: number;
  readonly maxRetries: number;
  /**
   * expand parameter for confluence rest api
   * description can be found at https://developer.atlassian.com/server/confluence/expansions-in-the-rest-api/
   */
  readonly expand?: string;
  readonly personalAccessToken?: string;
  constructor({
    baseUrl,
    spaceKey,
    username,
    accessToken,
    limit,
    expand,
    personalAccessToken,
    maxRetries
  }: ConfluencePagesLoaderParams);
  /**
   * Returns the authorization header for the request.
   * @returns The authorization header as a string, or undefined if no credentials were provided.
   */
  private get authorizationHeader();
  /**
   * Fetches all the pages in the specified space and converts each page to
   * a Document instance.
   * @param options the extra options of the load function
   * @param options.limit The limit parameter to overwrite the size to fetch pages.
   * @param options.start The start parameter to set inital offset to fetch pages.
   * @returns Promise resolving to an array of Document instances.
   */
  load(options?: {
    start?: number;
    limit?: number;
  }): Promise<Document[]>;
  /**
   * Fetches data from the Confluence API using the provided URL.
   * @param url The URL to fetch data from.
   * @returns Promise resolving to the JSON response from the API.
   */
  protected fetchConfluenceData(url: string): Promise<ConfluenceAPIResponse>;
  private fetchAllPagesInSpace;
  /**
   * Creates a Document instance from a ConfluencePage object.
   * @param page The ConfluencePage object to convert.
   * @returns A Document instance.
   */
  private createDocumentFromPage;
}
//#endregion
export { ConfluenceAPIResponse, ConfluencePage, ConfluencePagesLoader, ConfluencePagesLoaderParams };
//# sourceMappingURL=confluence.d.cts.map