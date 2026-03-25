import { Tool } from "@langchain/core/tools";

//#region src/tools/google_scholar.d.ts

/**
 * Interface for parameters required by the SERPGoogleScholarAPITool class.
 */
interface GoogleScholarAPIParams {
  /**
   * Optional API key for accessing the SerpApi service.
   */
  apiKey?: string;
}
/**
 * Tool for querying Google Scholar using the SerpApi service.
 */
declare class SERPGoogleScholarAPITool extends Tool {
  /**
   * Specifies the name of the tool, used internally by LangChain.
   */
  static lc_name(): string;
  /**
   * Returns a mapping of secret environment variable names to their usage in the tool.
   * @returns {object} Mapping of secret names to their environment variable counterparts.
   */
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  name: string;
  protected apiKey: string;
  /**
   * Description of the tool for usage documentation.
   */
  description: string;
  /**
   * Constructs a new instance of SERPGoogleScholarAPITool.
   * @param fields - Optional parameters including an API key.
   */
  constructor(fields?: GoogleScholarAPIParams);
  /**
   * Makes a request to SerpApi for Google Scholar results.
   * @param input - Search query string.
   * @returns A JSON string containing the search results.
   * @throws Error if the API request fails or returns an error.
   */
  _call(input: string): Promise<string>;
}
//#endregion
export { GoogleScholarAPIParams, SERPGoogleScholarAPITool };
//# sourceMappingURL=google_scholar.d.ts.map