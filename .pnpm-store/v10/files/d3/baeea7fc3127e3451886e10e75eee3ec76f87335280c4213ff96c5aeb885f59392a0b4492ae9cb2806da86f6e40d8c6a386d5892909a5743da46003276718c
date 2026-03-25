import { __export } from "../_virtual/rolldown_runtime.js";
import { Tool } from "@langchain/core/tools";

//#region src/tools/stackexchange.ts
var stackexchange_exports = {};
__export(stackexchange_exports, { StackExchangeAPI: () => StackExchangeAPI });
/**
* Class for interacting with the StackExchange API
* It extends the base Tool class to perform retrieval.
*/
var StackExchangeAPI = class extends Tool {
	name = "stackexchange";
	description = "Stack Exchange API Implementation";
	pageSize;
	maxResult = 3;
	key;
	accessToken;
	site = "stackoverflow";
	version = "2.3";
	baseUrl = "https://api.stackexchange.com";
	queryType = "all";
	options = {};
	resultSeparator = "\n\n";
	constructor(params = {}) {
		const { maxResult, queryType = "all", options, resultSeparator } = params;
		super();
		this.maxResult = maxResult || this.maxResult;
		this.pageSize = 100;
		this.baseUrl = `${this.baseUrl}/${this.version}/`;
		this.queryType = queryType === "all" ? "q" : queryType;
		this.options = options || this.options;
		this.resultSeparator = resultSeparator || this.resultSeparator;
	}
	async _call(query) {
		const params = {
			[this.queryType]: query,
			site: this.site,
			...this.options
		};
		const output = await this._fetch("search/excerpts", params);
		if (output.items.length < 1) return `No relevant results found for '${query}' on Stack Overflow.`;
		const questions = output.items.filter((item) => item.item_type === "question").slice(0, this.maxResult);
		const answers = output.items.filter((item) => item.item_type === "answer");
		const results = [];
		for (const question of questions) {
			let res_text = `Question: ${question.title}\n${question.excerpt}`;
			const relevant_answers = answers.filter((answer) => answer.question_id === question.question_id);
			const accepted_answers = relevant_answers.filter((answer) => answer.is_accepted);
			if (relevant_answers.length > 0) {
				const top_answer = accepted_answers.length > 0 ? accepted_answers[0] : relevant_answers[0];
				const { excerpt } = top_answer;
				res_text += `\nAnswer: ${excerpt}`;
			}
			results.push(res_text);
		}
		return results.join(this.resultSeparator);
	}
	/**
	* Call the StackExchange API
	* @param endpoint Name of the endpoint from StackExchange API
	* @param params Additional parameters passed to the endpoint
	* @param page Number of the page to retrieve
	* @param filter Filtering properties
	*/
	async _fetch(endpoint, params = {}, page = 1, filter = "default") {
		try {
			if (!endpoint) throw new Error("No end point provided.");
			const queryParams = new URLSearchParams({
				pagesize: this.pageSize.toString(),
				page: page.toString(),
				filter,
				...params
			});
			if (this.key) queryParams.append("key", this.key);
			if (this.accessToken) queryParams.append("access_token", this.accessToken);
			const queryParamsString = queryParams.toString();
			const endpointUrl = `${this.baseUrl}${endpoint}?${queryParamsString}`;
			return await this._makeRequest(endpointUrl);
		} catch {
			throw new Error("Error while calling Stack Exchange API");
		}
	}
	/**
	* Fetch the result of a specific endpoint
	* @param endpointUrl Endpoint to call
	*/
	async _makeRequest(endpointUrl) {
		try {
			const response = await fetch(endpointUrl);
			if (response.status !== 200) throw new Error(`HTTP Error: ${response.statusText}`);
			return await response.json();
		} catch {
			throw new Error(`Error while calling Stack Exchange API: ${endpointUrl}`);
		}
	}
};

//#endregion
export { StackExchangeAPI, stackexchange_exports };
//# sourceMappingURL=stackexchange.js.map