import { __export } from "../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { Tool } from "@langchain/core/tools";

//#region src/tools/google_scholar.ts
var google_scholar_exports = {};
__export(google_scholar_exports, { SERPGoogleScholarAPITool: () => SERPGoogleScholarAPITool });
/**
* Tool for querying Google Scholar using the SerpApi service.
*/
var SERPGoogleScholarAPITool = class extends Tool {
	/**
	* Specifies the name of the tool, used internally by LangChain.
	*/
	static lc_name() {
		return "SERPGoogleScholarAPITool";
	}
	/**
	* Returns a mapping of secret environment variable names to their usage in the tool.
	* @returns {object} Mapping of secret names to their environment variable counterparts.
	*/
	get lc_secrets() {
		return { apiKey: "SERPAPI_API_KEY" };
	}
	name = "serp_google_scholar";
	apiKey;
	/**
	* Description of the tool for usage documentation.
	*/
	description = `A wrapper around Google Scholar API via SerpApi. Useful for querying academic 
  articles and papers by keywords or authors. Input should be a search query string.`;
	/**
	* Constructs a new instance of SERPGoogleScholarAPITool.
	* @param fields - Optional parameters including an API key.
	*/
	constructor(fields) {
		super(...arguments);
		const apiKey = fields?.apiKey ?? getEnvironmentVariable("SERPAPI_API_KEY");
		if (!apiKey) throw new Error(`SerpApi key not set. You can set it as "SERPAPI_API_KEY" in your environment variables.`);
		this.apiKey = apiKey;
	}
	/**
	* Makes a request to SerpApi for Google Scholar results.
	* @param input - Search query string.
	* @returns A JSON string containing the search results.
	* @throws Error if the API request fails or returns an error.
	*/
	async _call(input) {
		const url = `https://serpapi.com/search.json?q=${encodeURIComponent(input)}&engine=google_scholar&api_key=${this.apiKey}`;
		const response = await fetch(url);
		if (!response.ok) {
			let message;
			try {
				const json$1 = await response.json();
				message = json$1.error;
			} catch {
				message = "Unable to parse error message: SerpApi did not return a JSON response.";
			}
			throw new Error(`Got ${response.status}: ${response.statusText} error from SerpApi: ${message}`);
		}
		const json = await response.json();
		const results = json.organic_results?.map((item) => ({
			title: item.title,
			link: item.link,
			snippet: item.snippet,
			publication_info: item.publication_info?.summary?.split(" - ").slice(1).join(" - ") ?? "",
			authors: item.publication_info?.authors?.map((author) => author.name).join(", ") ?? "",
			total_citations: item.inline_links?.cited_by?.total ?? ""
		})) ?? `No results found for ${input} on Google Scholar.`;
		return JSON.stringify(results, null, 2);
	}
};

//#endregion
export { SERPGoogleScholarAPITool, google_scholar_exports };
//# sourceMappingURL=google_scholar.js.map