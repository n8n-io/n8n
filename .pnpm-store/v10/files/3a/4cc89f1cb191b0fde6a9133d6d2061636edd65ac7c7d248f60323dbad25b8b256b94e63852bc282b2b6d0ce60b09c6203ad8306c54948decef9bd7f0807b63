const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));

//#region src/tools/dataforseo_api_search.ts
var dataforseo_api_search_exports = {};
require_rolldown_runtime.__export(dataforseo_api_search_exports, { DataForSeoAPISearch: () => DataForSeoAPISearch });
/**
* @class DataForSeoAPISearch
* @extends {Tool}
* @description Represents a wrapper class to work with DataForSEO SERP API.
*/
var DataForSeoAPISearch = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "DataForSeoAPISearch";
	}
	name = "dataforseo-api-wrapper";
	description = "A robust Google Search API provided by DataForSeo. This tool is handy when you need information about trending topics or current events.";
	apiLogin;
	apiPassword;
	/**
	* @property defaultParams
	* @type {Record<string, string | number | boolean>}
	* @description These are the default parameters to be used when making an API request.
	*/
	defaultParams = {
		location_name: "United States",
		language_code: "en",
		depth: 10,
		se_name: "google",
		se_type: "organic"
	};
	params = {};
	jsonResultTypes;
	jsonResultFields;
	topCount;
	useJsonOutput = false;
	/**
	* @constructor
	* @param {DataForSeoApiConfig} config
	* @description Sets up the class, throws an error if the API login/password isn't provided.
	*/
	constructor(config = {}) {
		super();
		const apiLogin = config.apiLogin ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("DATAFORSEO_LOGIN");
		const apiPassword = config.apiPassword ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("DATAFORSEO_PASSWORD");
		const params = config.params ?? {};
		if (!apiLogin || !apiPassword) throw new Error("DataForSEO login or password not set. You can set it as DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in your .env file, or pass it to DataForSeoAPISearch.");
		this.params = {
			...this.defaultParams,
			...params
		};
		this.apiLogin = apiLogin;
		this.apiPassword = apiPassword;
		this.jsonResultTypes = config.jsonResultTypes;
		this.jsonResultFields = config.jsonResultFields;
		this.useJsonOutput = config.useJsonOutput ?? false;
		this.topCount = config.topCount;
	}
	/**
	* @method _call
	* @param {string} keyword
	* @returns {Promise<string>}
	* @description Initiates a call to the API and processes the response.
	*/
	async _call(keyword) {
		return this.useJsonOutput ? JSON.stringify(await this.results(keyword)) : this.processResponse(await this.getResponseJson(keyword));
	}
	/**
	* @method results
	* @param {string} keyword
	* @returns {Promise<Array<any>>}
	* @description Fetches the results from the API for the given keyword.
	*/
	async results(keyword) {
		const res = await this.getResponseJson(keyword);
		return this.filterResults(res, this.jsonResultTypes);
	}
	/**
	* @method prepareRequest
	* @param {string} keyword
	* @returns {{url: string; headers: HeadersInit; data: BodyInit}}
	* @description Prepares the request details for the API call.
	*/
	prepareRequest(keyword) {
		if (this.apiLogin === void 0 || this.apiPassword === void 0) throw new Error("api_login or api_password is not provided");
		const credentials = Buffer.from(`${this.apiLogin}:${this.apiPassword}`, "utf-8").toString("base64");
		const headers = {
			Authorization: `Basic ${credentials}`,
			"Content-Type": "application/json"
		};
		const params = { ...this.params };
		params.keyword ??= keyword;
		const data = [params];
		return {
			url: `https://api.dataforseo.com/v3/serp/${params.se_name}/${params.se_type}/live/advanced`,
			headers,
			data: JSON.stringify(data)
		};
	}
	/**
	* @method getResponseJson
	* @param {string} keyword
	* @returns {Promise<ApiResponse>}
	* @description Executes a POST request to the provided URL and returns a parsed JSON response.
	*/
	async getResponseJson(keyword) {
		const requestDetails = this.prepareRequest(keyword);
		const response = await fetch(requestDetails.url, {
			method: "POST",
			headers: requestDetails.headers,
			body: requestDetails.data
		});
		if (!response.ok) throw new Error(`Got ${response.status} error from DataForSEO: ${response.statusText}`);
		const result = await response.json();
		return this.checkResponse(result);
	}
	/**
	* @method checkResponse
	* @param {ApiResponse} response
	* @returns {ApiResponse}
	* @description Checks the response status code.
	*/
	checkResponse(response) {
		if (response.status_code !== 2e4) throw new Error(`Got error from DataForSEO SERP API: ${response.status_message}`);
		for (const task of response.tasks) if (task.status_code !== 2e4) throw new Error(`Got error from DataForSEO SERP API: ${task.status_message}`);
		return response;
	}
	/**
	* @method filterResults
	* @param {ApiResponse} res
	* @param {Array<string> | undefined} types
	* @returns {Array<any>}
	* @description Filters the results based on the specified result types.
	*/
	filterResults(res, types) {
		const output = [];
		for (const task of res.tasks || []) for (const result of task.result || []) for (const item of result.items || []) {
			if (types === void 0 || types.length === 0 || types.includes(item.type)) {
				const newItem = this.cleanupUnnecessaryItems(item);
				if (Object.keys(newItem).length !== 0) output.push(newItem);
			}
			if (this.topCount !== void 0 && output.length >= this.topCount) break;
		}
		return output;
	}
	/**
	* @method cleanupUnnecessaryItems
	* @param {any} d
	* @description Removes unnecessary items from the response.
	*/
	cleanupUnnecessaryItems(d) {
		if (Array.isArray(d)) return d.map((item) => this.cleanupUnnecessaryItems(item));
		const toRemove = [
			"xpath",
			"position",
			"rectangle"
		];
		if (typeof d === "object" && d !== null) return Object.keys(d).reduce((newObj, key) => {
			if ((this.jsonResultFields === void 0 || this.jsonResultFields.includes(key)) && !toRemove.includes(key)) if (typeof d[key] === "object" && d[key] !== null) newObj[key] = this.cleanupUnnecessaryItems(d[key]);
			else newObj[key] = d[key];
			return newObj;
		}, {});
		return d;
	}
	/**
	* @method processResponse
	* @param {ApiResponse} res
	* @returns {string}
	* @description Processes the response to extract meaningful data.
	*/
	processResponse(res) {
		let returnValue = "No good search result found";
		for (const task of res.tasks || []) for (const result of task.result || []) {
			const { item_types } = result;
			const items = result.items || [];
			if (item_types.includes("answer_box")) returnValue = items.find((item) => item.type === "answer_box").text;
			else if (item_types.includes("knowledge_graph")) returnValue = items.find((item) => item.type === "knowledge_graph").description;
			else if (item_types.includes("featured_snippet")) returnValue = items.find((item) => item.type === "featured_snippet").description;
			else if (item_types.includes("shopping")) returnValue = items.find((item) => item.type === "shopping").price;
			else if (item_types.includes("organic")) returnValue = items.find((item) => item.type === "organic").description;
			if (returnValue) break;
		}
		return returnValue;
	}
};

//#endregion
exports.DataForSeoAPISearch = DataForSeoAPISearch;
Object.defineProperty(exports, 'dataforseo_api_search_exports', {
  enumerable: true,
  get: function () {
    return dataforseo_api_search_exports;
  }
});
//# sourceMappingURL=dataforseo_api_search.cjs.map