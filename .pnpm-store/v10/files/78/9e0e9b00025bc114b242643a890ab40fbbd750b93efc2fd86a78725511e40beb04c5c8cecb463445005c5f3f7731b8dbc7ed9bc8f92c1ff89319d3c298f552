import { __export } from "../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { Tool } from "@langchain/core/tools";

//#region src/tools/google_trends.ts
var google_trends_exports = {};
__export(google_trends_exports, { SERPGoogleTrendsTool: () => SERPGoogleTrendsTool });
/**
* Tool that queries the Google Trends API. Uses default interest over time.
*/
var SERPGoogleTrendsTool = class extends Tool {
	static lc_name() {
		return "SERPGoogleTrendsTool";
	}
	get lc_secrets() {
		return { apiKey: "SERPAPI_API_KEY" };
	}
	name = "google_trends";
	apiKey;
	description = `A wrapper around Google Trends API. Useful for analyzing and retrieving trending search data based on keywords, 
    categories, or regions. Input should be a search query or specific parameters for trends analysis.`;
	constructor(fields) {
		super(...arguments);
		const apiKey = fields?.apiKey ?? getEnvironmentVariable("SERPAPI_API_KEY");
		if (apiKey === void 0) throw new Error(`Google Trends API key not set. You can set it as "SERPAPI_API_KEY" in your environment variables.`);
		this.apiKey = apiKey;
	}
	async _call(query) {
		/**
		* Related queries only accepts one at a time, and multiple
		* queries at once on interest over time (default) is effectively the same as
		* each query one by one.
		*
		* SerpApi caches queries, so the first time will be slower
		* and subsequent identical queries will be very fast.
		*/
		if (query.split(",").length > 1) throw new Error("Please do one query at a time");
		const serpapiApiKey = this.apiKey;
		const params = new URLSearchParams({
			engine: "google_trends",
			api_key: serpapiApiKey,
			q: query
		});
		const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
			method: "GET",
			headers: { "Content-Type": "application/json" }
		});
		if (!res.ok) throw new Error(`Error fetching data from SerpAPI: ${res.statusText}`);
		const clientDict = await res.json();
		const totalResults = clientDict.interest_over_time?.timeline_data ?? [];
		if (totalResults.length === 0) return "No good Trend Result was found";
		const startDate = totalResults[0].date.split(" ");
		const endDate = totalResults[totalResults.length - 1].date.split(" ");
		const values = totalResults.map((result) => result.values[0].extracted_value);
		const minValue = Math.min(...values);
		const maxValue = Math.max(...values);
		const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
		const percentageChange = (values[values.length - 1] - values[0]) / (values[0] || 1) * 100;
		const relatedParams = new URLSearchParams({
			engine: "google_trends",
			api_key: serpapiApiKey,
			data_type: "RELATED_QUERIES",
			q: query
		});
		const relatedRes = await fetch(`https://serpapi.com/search.json?${relatedParams.toString()}`, {
			method: "GET",
			headers: { "Content-Type": "application/json" }
		});
		let rising = [];
		let top = [];
		if (!relatedRes.ok) console.error(`Error fetching related queries from SerpAPI: ${relatedRes.statusText}`);
		else {
			const relatedDict = await relatedRes.json();
			rising = relatedDict.related_queries?.rising?.map((result) => result.query) ?? [];
			top = relatedDict.related_queries?.top?.map((result) => result.query) ?? [];
		}
		const doc = [
			`Query: ${query}`,
			`Date From: ${startDate[0]} ${startDate[1]}, ${startDate[2]}`,
			`Date To: ${endDate[0]} ${endDate[1]} ${endDate[2]}`,
			`Min Value: ${minValue}`,
			`Max Value: ${maxValue}`,
			`Average Value: ${avgValue}`,
			`Percent Change: ${percentageChange.toFixed(2)}%`,
			`Trend values: ${values.join(", ")}`,
			`Rising Related Queries: ${rising.join(", ")}`,
			`Top Related Queries: ${top.join(", ")}`
		];
		return doc.join("\n\n");
	}
};

//#endregion
export { SERPGoogleTrendsTool, google_trends_exports };
//# sourceMappingURL=google_trends.js.map