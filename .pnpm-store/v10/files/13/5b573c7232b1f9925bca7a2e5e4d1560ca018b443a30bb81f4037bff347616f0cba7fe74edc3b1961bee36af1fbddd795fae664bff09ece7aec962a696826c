const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));

//#region src/tools/brave_search.ts
var brave_search_exports = {};
require_rolldown_runtime.__export(brave_search_exports, { BraveSearch: () => BraveSearch });
/**
* Class for interacting with the Brave Search engine. It extends the Tool
* class and requires an API key to function. The API key can be passed in
* during instantiation or set as an environment variable named
* 'BRAVE_SEARCH_API_KEY'.
*/
var BraveSearch = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "BraveSearch";
	}
	name = "brave-search";
	description = "a search engine. useful for when you need to answer questions about current events. input should be a search query.";
	apiKey;
	constructor(fields = { apiKey: (0, __langchain_core_utils_env.getEnvironmentVariable)("BRAVE_SEARCH_API_KEY") }) {
		super();
		if (!fields.apiKey) throw new Error(`Brave API key not set. Please pass it in or set it as an environment variable named "BRAVE_SEARCH_API_KEY".`);
		this.apiKey = fields.apiKey;
	}
	/** @ignore */
	async _call(input) {
		const headers = {
			"X-Subscription-Token": this.apiKey,
			Accept: "application/json"
		};
		const searchUrl = new URL(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(input)}`);
		const response = await fetch(searchUrl, { headers });
		if (!response.ok) throw new Error(`HTTP error ${response.status}`);
		const parsedResponse = await response.json();
		const webSearchResults = parsedResponse.web?.results;
		const finalResults = Array.isArray(webSearchResults) ? webSearchResults.map((item) => ({
			title: item.title,
			link: item.url,
			snippet: item.description
		})) : [];
		return JSON.stringify(finalResults);
	}
};

//#endregion
exports.BraveSearch = BraveSearch;
Object.defineProperty(exports, 'brave_search_exports', {
  enumerable: true,
  get: function () {
    return brave_search_exports;
  }
});
//# sourceMappingURL=brave_search.cjs.map