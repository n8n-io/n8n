import { Tool } from "@langchain/core/tools";

//#region src/tools/searxng_search.d.ts

/**
 * Interface for custom headers used in the Searxng search.
 */
interface SearxngCustomHeaders {
  [key: string]: string;
}
interface SearxngSearchParams {
  /**
   * @default 10
   * Number of results included in results
   */
  numResults?: number;
  /** Comma separated list, specifies the active search categories
   * https://docs.searxng.org/user/configured_engines.html#configured-engines
   */
  categories?: string;
  /** Comma separated list, specifies the active search engines
   * https://docs.searxng.org/user/configured_engines.html#configured-engines
   */
  engines?: string;
  /** Code of the language. */
  language?: string;
  /** Search page number. */
  pageNumber?: number;
  /**
   * day / month / year
   *
   * Time range of search for engines which support it. See if an engine supports time range search in the preferences page of an instance.
   */
  timeRange?: number;
  /**
   * Throws Error if format is set anything other than "json"
   * Output format of results. Format needs to be activated in search:
   */
  format?: "json";
  /** Open search results on new tab. */
  resultsOnNewTab?: 0 | 1;
  /** Proxy image results through SearXNG. */
  imageProxy?: boolean;
  autocomplete?: string;
  /**
   * Filter search results of engines which support safe search. See if an engine supports safe search in the preferences page of an instance.
   */
  safesearch?: 0 | 1 | 2;
}
/**
 * SearxngSearch class represents a meta search engine tool.
 * Use this class when you need to answer questions about current events.
 * The input should be a search query, and the output is a JSON array of the query results.
 *
 * note: works best with *agentType*: `structured-chat-zero-shot-react-description`
 * https://github.com/searxng/searxng
 * @example
 * ```typescript
 * const executor = AgentExecutor.fromAgentAndTools({
 *   agent,
 *   tools: [
 *     new SearxngSearch({
 *       params: {
 *         format: "json",
 *         engines: "google",
 *       },
 *       headers: {},
 *     }),
 *   ],
 * });
 * const result = await executor.invoke({
 *   input: `What is Langchain? Describe in 50 words`,
 * });
 * ```
 */
declare class SearxngSearch extends Tool {
  static lc_name(): string;
  name: string;
  description: string;
  protected apiBase?: string;
  protected params?: SearxngSearchParams;
  protected headers?: SearxngCustomHeaders;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  /**
   * Constructor for the SearxngSearch class
   * @param apiBase Base URL of the Searxng instance
   * @param params SearxNG parameters
   * @param headers Custom headers
   */
  constructor({
    apiBase,
    params,
    headers
  }: {
    /** Base URL of Searxng instance */
    apiBase?: string;
    /** SearxNG Paramerters
     *
     *  https://docs.searxng.org/dev/search_api.html check here for more details
     */
    params?: SearxngSearchParams;
    /**
     * Custom headers
     * Set custom headers if you're using a api from RapidAPI (https://rapidapi.com/iamrony777/api/searxng)
     * No headers needed for a locally self-hosted instance
     */
    headers?: SearxngCustomHeaders;
  });
  /**
   * Builds the URL for the Searxng search.
   * @param path The path for the URL.
   * @param parameters The parameters for the URL.
   * @param baseUrl The base URL.
   * @returns The complete URL as a string.
   */
  protected buildUrl<P extends SearxngSearchParams>(path: string, parameters: P, baseUrl: string): string;
  _call(input: string): Promise<string>;
}
//#endregion
export { SearxngSearch };
//# sourceMappingURL=searxng_search.d.ts.map