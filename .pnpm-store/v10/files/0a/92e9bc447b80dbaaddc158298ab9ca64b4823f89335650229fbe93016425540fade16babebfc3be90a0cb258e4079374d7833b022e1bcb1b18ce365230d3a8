import { OpenAI as OpenAI$1 } from "openai";
import { ServerTool } from "@langchain/core/tools";

//#region src/tools/webSearch.d.ts

/**
 * User location configuration for geographic search refinement.
 */
interface WebSearchUserLocation {
  /**
   * The type of location. Currently only "approximate" is supported.
   */
  type: "approximate";
  /**
   * Two-letter ISO country code (e.g., "US", "GB").
   * @see https://en.wikipedia.org/wiki/ISO_3166-1
   */
  country?: string;
  /**
   * City name (e.g., "San Francisco", "London").
   */
  city?: string;
  /**
   * Region or state name (e.g., "California", "London").
   */
  region?: string;
  /**
   * IANA timezone (e.g., "America/Los_Angeles", "Europe/London").
   * @see https://timeapi.io/documentation/iana-timezones
   */
  timezone?: string;
}
/**
 * Domain filtering configuration for web search.
 */
interface WebSearchFilters {
  /**
   * Allow-list of up to 100 domains to limit search results.
   * Omit the HTTP/HTTPS prefix (e.g., "openai.com" instead of "https://openai.com/").
   * Includes subdomains automatically.
   */
  allowedDomains?: string[];
}
/**
 * Options for the OpenAI web search tool.
 */
interface WebSearchOptions {
  /**
   * Domain filtering configuration.
   * Limit results to a specific set of up to 100 domains.
   */
  filters?: WebSearchFilters;
  /**
   * Approximate user location for geographic search refinement.
   * Not supported for deep research models.
   */
  userLocation?: WebSearchUserLocation;
  /**
   * High level guidance for the amount of context window space to use for the
   * search. One of `low`, `medium`, or `high`. `medium` is the default.
   */
  search_context_size?: "low" | "medium" | "high";
}
/**
 * OpenAI web search tool type for the Responses API.
 */
type WebSearchTool = OpenAI$1.Responses.WebSearchTool;
/**
 * Creates a web search tool that allows OpenAI models to search the web
 * for up-to-date information before generating a response.
 *
 * Web search supports three main types:
 * 1. **Non-reasoning web search**: Quick lookups where the model passes queries
 *    directly to the search tool.
 * 2. **Agentic search with reasoning models**: The model actively manages the
 *    search process, analyzing results and deciding whether to keep searching.
 * 3. **Deep research**: Extended investigations using models like `o3-deep-research`
 *    or `gpt-5` with high reasoning effort.
 *
 * @see {@link https://platform.openai.com/docs/guides/tools-web-search | OpenAI Web Search Documentation}
 * @param options - Configuration options for the web search tool
 * @returns A web search tool definition to be passed to the OpenAI Responses API
 *
 * @example
 * ```typescript
 * import { ChatOpenAI, tools } from "@langchain/openai";
 *
 * const model = new ChatOpenAI({
 *   model: "gpt-4o",
 * });
 *
 * // Basic usage
 * const response = await model.invoke("What was a positive news story from today?", {
 *   tools: [tools.webSearch()],
 * });
 *
 * // With domain filtering
 * const filteredResponse = await model.invoke("Latest AI research news", {
 *   tools: [tools.webSearch({
 *     filters: {
 *       allowedDomains: ["arxiv.org", "nature.com", "science.org"],
 *     },
 *   })],
 * });
 *
 * // With user location for geographic relevance
 * const localResponse = await model.invoke("What are the best restaurants near me?", {
 *   tools: [tools.webSearch({
 *     userLocation: {
 *       type: "approximate",
 *       country: "US",
 *       city: "San Francisco",
 *       region: "California",
 *       timezone: "America/Los_Angeles",
 *     },
 *   })],
 * });
 *
 * // Cache-only mode (no live internet access)
 * const cachedResponse = await model.invoke("Find information about OpenAI", {
 *   tools: [tools.webSearch({
 *     externalWebAccess: false,
 *   })],
 * });
 * ```
 */
declare function webSearch(options?: WebSearchOptions): ServerTool;
//#endregion
export { WebSearchFilters, WebSearchOptions, WebSearchTool, webSearch };
//# sourceMappingURL=webSearch.d.ts.map