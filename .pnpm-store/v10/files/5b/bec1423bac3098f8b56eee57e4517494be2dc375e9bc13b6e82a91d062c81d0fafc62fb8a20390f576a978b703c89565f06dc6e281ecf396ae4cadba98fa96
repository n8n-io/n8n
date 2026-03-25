import { Tool } from "@langchain/core/tools";
import * as _langchain_core_load_serializable4 from "@langchain/core/load/serializable";

//#region src/tools/searchapi.d.ts
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
 * SearchApi Class Definition.
 *
 * Provides a wrapper around the SearchApi.
 *
 * Ensure you've set the SEARCHAPI_API_KEY environment variable for authentication.
 * You can obtain a free API key from https://www.searchapi.io/.
 * @example
 * ```typescript
 * const searchApi = new SearchApi("your-api-key", {
 *   engine: "google_news",
 * });
 * const agent = RunnableSequence.from([
 *   ChatPromptTemplate.fromMessages([
 *     ["ai", "Answer the following questions using a bulleted list markdown format.""],
 *     ["human", "{input}"],
 *   ]),
 *   new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 }),
 *   (input: BaseMessageChunk) => ({
 *     log: "test",
 *     returnValues: {
 *       output: input,
 *     },
 *   }),
 * ]);
 * const executor = AgentExecutor.fromAgentAndTools({
 *   agent,
 *   tools: [searchApi],
 * });
 * const res = await executor.invoke({
 *   input: "What's happening in Ukraine today?"",
 * });
 * console.log(res);
 * ```
 */
declare class SearchApi extends Tool {
  static lc_name(): string;
  /**
   * Converts the SearchApi instance to JSON. This method is not implemented
   * and will throw an error if called.
   * @returns Throws an error.
   */
  toJSON(): _langchain_core_load_serializable4.SerializedNotImplemented;
  protected apiKey: string;
  protected params: Partial<SearchApiParameters>;
  constructor(apiKey?: string | undefined, params?: Partial<SearchApiParameters>);
  name: string;
  /**
   * Builds a URL for the SearchApi request.
   * @param parameters The parameters for the request.
   * @returns A string representing the built URL.
   */
  protected buildUrl(searchQuery: string): string;
  /** @ignore */
  /**
   * Calls the SearchAPI.
   *
   * Accepts an input query and fetches the result from SearchApi.
   *
   * @param {string} input - Search query.
   * @returns {string} - Formatted search results or an error message.
   *
   * NOTE: This method is the core search handler and processes various types
   * of search results including Google organic results, videos, jobs, and images.
   */
  _call(input: string): Promise<any>;
  description: string;
}
//#endregion
export { SearchApi, SearchApiParameters };
//# sourceMappingURL=searchapi.d.cts.map