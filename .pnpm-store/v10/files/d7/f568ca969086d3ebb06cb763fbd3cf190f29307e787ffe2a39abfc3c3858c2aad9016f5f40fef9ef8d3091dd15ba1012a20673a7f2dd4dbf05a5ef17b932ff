const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));

//#region src/tools/google_custom_search.ts
var google_custom_search_exports = {};
require_rolldown_runtime.__export(google_custom_search_exports, { GoogleCustomSearch: () => GoogleCustomSearch });
/**
* Class that uses the Google Search API to perform custom searches.
* Requires environment variables `GOOGLE_API_KEY` and `GOOGLE_CSE_ID` to
* be set.
*/
var GoogleCustomSearch = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "GoogleCustomSearch";
	}
	get lc_secrets() {
		return { apiKey: "GOOGLE_API_KEY" };
	}
	name = "google-custom-search";
	apiKey;
	googleCSEId;
	description = "a custom search engine. useful for when you need to answer questions about current events. input should be a search query. outputs a JSON array of results.";
	constructor(fields = {
		apiKey: (0, __langchain_core_utils_env.getEnvironmentVariable)("GOOGLE_API_KEY"),
		googleCSEId: (0, __langchain_core_utils_env.getEnvironmentVariable)("GOOGLE_CSE_ID")
	}) {
		super(...arguments);
		if (!fields.apiKey) throw new Error(`Google API key not set. You can set it as "GOOGLE_API_KEY" in your environment variables.`);
		if (!fields.googleCSEId) throw new Error(`Google custom search engine id not set. You can set it as "GOOGLE_CSE_ID" in your environment variables.`);
		this.apiKey = fields.apiKey;
		this.googleCSEId = fields.googleCSEId;
	}
	async _call(input) {
		const res = await fetch(`https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${this.googleCSEId}&q=${encodeURIComponent(input)}`);
		if (!res.ok) throw new Error(`Got ${res.status} error from Google custom search: ${res.statusText}`);
		const json = await res.json();
		const results = json?.items?.map((item) => ({
			title: item.title,
			link: item.link,
			snippet: item.snippet
		})) ?? [];
		return JSON.stringify(results);
	}
};

//#endregion
exports.GoogleCustomSearch = GoogleCustomSearch;
Object.defineProperty(exports, 'google_custom_search_exports', {
  enumerable: true,
  get: function () {
    return google_custom_search_exports;
  }
});
//# sourceMappingURL=google_custom_search.cjs.map