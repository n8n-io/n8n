import { Tool } from "@langchain/core/tools";

//#region src/tools/dataforseo_api_search.d.ts

/**
 * @interface DataForSeoApiConfig
 * @description Represents the configuration object used to set up a DataForSeoAPISearch instance.
 */
interface DataForSeoApiConfig {
  /**
   * @property apiLogin
   * @type {string}
   * @description The API login credential for DataForSEO. If not provided, it will be fetched from environment variables.
   */
  apiLogin?: string;
  /**
   * @property apiPassword
   * @type {string}
   * @description The API password credential for DataForSEO. If not provided, it will be fetched from environment variables.
   */
  apiPassword?: string;
  /**
   * @property params
   * @type {Record<string, string | number | boolean>}
   * @description Additional parameters to customize the API request.
   */
  params?: Record<string, string | number | boolean>;
  /**
   * @property useJsonOutput
   * @type {boolean}
   * @description Determines if the output should be in JSON format.
   */
  useJsonOutput?: boolean;
  /**
   * @property jsonResultTypes
   * @type {Array<string>}
   * @description Specifies the types of results to include in the output.
   */
  jsonResultTypes?: Array<string>;
  /**
   * @property jsonResultFields
   * @type {Array<string>}
   * @description Specifies the fields to include in each result object.
   */
  jsonResultFields?: Array<string>;
  /**
   * @property topCount
   * @type {number}
   * @description Specifies the maximum number of results to return.
   */
  topCount?: number;
}
/**
 * Represents a task in the API response.
 */
type Task = {
  id: string;
  status_code: number;
  status_message: string;
  time: string;
  result: Result[];
};
/**
 * Represents a result in the API response.
 */
type Result = {
  keyword: string;
  check_url: string;
  datetime: string;
  spell?: string;
  item_types: string[];
  se_results_count: number;
  items_count: number;
  items: any[];
};
/**
 * Represents the API response.
 */
type ApiResponse = {
  status_code: number;
  status_message: string;
  tasks: Task[];
};
/**
 * @class DataForSeoAPISearch
 * @extends {Tool}
 * @description Represents a wrapper class to work with DataForSEO SERP API.
 */
declare class DataForSeoAPISearch extends Tool {
  static lc_name(): string;
  name: string;
  description: string;
  protected apiLogin: string;
  protected apiPassword: string;
  /**
   * @property defaultParams
   * @type {Record<string, string | number | boolean>}
   * @description These are the default parameters to be used when making an API request.
   */
  protected defaultParams: Record<string, string | number | boolean>;
  protected params: Record<string, string | number | boolean>;
  protected jsonResultTypes: Array<string> | undefined;
  protected jsonResultFields: Array<string> | undefined;
  protected topCount: number | undefined;
  protected useJsonOutput: boolean;
  /**
   * @constructor
   * @param {DataForSeoApiConfig} config
   * @description Sets up the class, throws an error if the API login/password isn't provided.
   */
  constructor(config?: DataForSeoApiConfig);
  /**
   * @method _call
   * @param {string} keyword
   * @returns {Promise<string>}
   * @description Initiates a call to the API and processes the response.
   */
  _call(keyword: string): Promise<string>;
  /**
   * @method results
   * @param {string} keyword
   * @returns {Promise<Array<any>>}
   * @description Fetches the results from the API for the given keyword.
   */
  results(keyword: string): Promise<Array<any>>;
  /**
   * @method prepareRequest
   * @param {string} keyword
   * @returns {{url: string; headers: HeadersInit; data: BodyInit}}
   * @description Prepares the request details for the API call.
   */
  protected prepareRequest(keyword: string): {
    url: string;
    headers: HeadersInit;
    data: BodyInit;
  };
  /**
   * @method getResponseJson
   * @param {string} keyword
   * @returns {Promise<ApiResponse>}
   * @description Executes a POST request to the provided URL and returns a parsed JSON response.
   */
  protected getResponseJson(keyword: string): Promise<ApiResponse>;
  /**
   * @method checkResponse
   * @param {ApiResponse} response
   * @returns {ApiResponse}
   * @description Checks the response status code.
   */
  private checkResponse;
  /**
   * @method filterResults
   * @param {ApiResponse} res
   * @param {Array<string> | undefined} types
   * @returns {Array<any>}
   * @description Filters the results based on the specified result types.
   */
  private filterResults;
  /**
   * @method cleanupUnnecessaryItems
   * @param {any} d
   * @description Removes unnecessary items from the response.
   */
  private cleanupUnnecessaryItems;
  /**
   * @method processResponse
   * @param {ApiResponse} res
   * @returns {string}
   * @description Processes the response to extract meaningful data.
   */
  protected processResponse(res: ApiResponse): string;
}
//#endregion
export { DataForSeoAPISearch, DataForSeoApiConfig };
//# sourceMappingURL=dataforseo_api_search.d.cts.map