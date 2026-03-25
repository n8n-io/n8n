import { __export } from "../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { Tool } from "@langchain/core/tools";

//#region src/tools/google_custom_search.ts
var google_custom_search_exports = {};
__export(google_custom_search_exports, { GoogleCustomSearch: () => GoogleCustomSearch });
/**
* Class that uses the Google Search API to perform custom searches.
* Requires environment variables `GOOGLE_API_KEY` and `GOOGLE_CSE_ID` to
* be set.
*/
var GoogleCustomSearch = class extends Tool {
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
		apiKey: getEnvironmentVariable("GOOGLE_API_KEY"),
		googleCSEId: getEnvironmentVariable("GOOGLE_CSE_ID")
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
export { GoogleCustomSearch, google_custom_search_exports };
//# sourceMappingURL=google_custom_search.js.map