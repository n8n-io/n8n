
//#region src/tools/webSearch.ts
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
function webSearch(options) {
	return {
		type: "web_search",
		filters: options?.filters?.allowedDomains ? { allowed_domains: options.filters.allowedDomains } : void 0,
		user_location: options?.userLocation,
		search_context_size: options?.search_context_size
	};
}

//#endregion
exports.webSearch = webSearch;
//# sourceMappingURL=webSearch.cjs.map