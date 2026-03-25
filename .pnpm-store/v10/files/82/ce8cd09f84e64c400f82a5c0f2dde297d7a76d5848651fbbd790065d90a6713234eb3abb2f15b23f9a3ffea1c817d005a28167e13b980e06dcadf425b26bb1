import { __export } from "../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { Tool } from "@langchain/core/tools";

//#region src/tools/searxng_search.ts
var searxng_search_exports = {};
__export(searxng_search_exports, { SearxngSearch: () => SearxngSearch });
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
var SearxngSearch = class extends Tool {
	static lc_name() {
		return "SearxngSearch";
	}
	name = "searxng-search";
	description = "A meta search engine. Useful for when you need to answer questions about current events. Input should be a search query. Output is a JSON array of the query results";
	apiBase;
	params = {
		numResults: 10,
		pageNumber: 1,
		format: "json",
		imageProxy: true,
		safesearch: 0
	};
	headers;
	get lc_secrets() {
		return { apiBase: "SEARXNG_API_BASE" };
	}
	/**
	* Constructor for the SearxngSearch class
	* @param apiBase Base URL of the Searxng instance
	* @param params SearxNG parameters
	* @param headers Custom headers
	*/
	constructor({ apiBase, params, headers }) {
		super(...arguments);
		this.apiBase = getEnvironmentVariable("SEARXNG_API_BASE") || apiBase;
		this.headers = {
			"content-type": "application/json",
			...headers
		};
		if (!this.apiBase) throw new Error(`SEARXNG_API_BASE not set. You can set it as "SEARXNG_API_BASE" in your environment variables.`);
		if (params) this.params = {
			...this.params,
			...params
		};
	}
	/**
	* Builds the URL for the Searxng search.
	* @param path The path for the URL.
	* @param parameters The parameters for the URL.
	* @param baseUrl The base URL.
	* @returns The complete URL as a string.
	*/
	buildUrl(path, parameters, baseUrl) {
		const nonUndefinedParams = Object.entries(parameters).filter(([_, value]) => value !== void 0).map(([key, value]) => [key, value.toString()]);
		const searchParams = new URLSearchParams(nonUndefinedParams);
		return `${baseUrl}/${path}?${searchParams}`;
	}
	async _call(input) {
		const queryParams = {
			q: input,
			...this.params
		};
		const url = this.buildUrl("search", queryParams, this.apiBase);
		const resp = await fetch(url, {
			method: "POST",
			headers: this.headers,
			signal: AbortSignal.timeout(5 * 1e3)
		});
		if (!resp.ok) throw new Error(resp.statusText);
		const res = await resp.json();
		if (!res.results.length && !res.answers.length && !res.infoboxes.length && !res.suggestions.length) return "No good results found.";
		else if (res.results.length) {
			const response = [];
			res.results.forEach((r) => {
				response.push(JSON.stringify({
					title: r.title || "",
					link: r.url || "",
					snippet: r.content || ""
				}));
			});
			return response.slice(0, this.params?.numResults).toString();
		} else if (res.answers.length) return res.answers[0];
		else if (res.infoboxes.length) {
			let content = res.infoboxes[0]?.content ?? "";
			let previous;
			do {
				previous = content;
				content = content.replace(/<[^>]+>/gi, "");
			} while (content !== previous);
			return content;
		} else if (res.suggestions.length) {
			let suggestions = "Suggestions: ";
			res.suggestions.forEach((s) => {
				suggestions += `${s}, `;
			});
			return suggestions;
		} else return "No good results found.";
	}
};

//#endregion
export { SearxngSearch, searxng_search_exports };
//# sourceMappingURL=searxng_search.js.map