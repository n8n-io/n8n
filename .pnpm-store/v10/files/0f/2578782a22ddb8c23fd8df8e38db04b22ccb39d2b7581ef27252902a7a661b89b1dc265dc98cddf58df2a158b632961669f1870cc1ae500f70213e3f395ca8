const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));

//#region src/tools/serper.ts
var serper_exports = {};
require_rolldown_runtime.__export(serper_exports, { Serper: () => Serper });
/**
* Wrapper around serper.
*
* You can create a free API key at https://serper.dev.
*
* To use, you should have the SERPER_API_KEY environment variable set.
*/
var Serper = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "Serper";
	}
	/**
	* Converts the Serper instance to JSON. This method is not implemented
	* and will throw an error if called.
	* @returns Throws an error.
	*/
	toJSON() {
		return this.toJSONNotImplemented();
	}
	key;
	params;
	constructor(apiKey = (0, __langchain_core_utils_env.getEnvironmentVariable)("SERPER_API_KEY"), params = {}) {
		super();
		if (!apiKey) throw new Error("Serper API key not set. You can set it as SERPER_API_KEY in your .env file, or pass it to Serper.");
		this.key = apiKey;
		this.params = params;
	}
	name = "search";
	/** @ignore */
	async _call(input) {
		const options = {
			method: "POST",
			headers: {
				"X-API-KEY": this.key,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				q: input,
				...this.params
			})
		};
		const res = await fetch("https://google.serper.dev/search", options);
		if (!res.ok) throw new Error(`Got ${res.status} error from serper: ${res.statusText}`);
		const json = await res.json();
		if (json.answerBox?.answer) return json.answerBox.answer;
		if (json.answerBox?.snippet) return json.answerBox.snippet;
		if (json.answerBox?.snippet_highlighted_words) return json.answerBox.snippet_highlighted_words[0];
		if (json.sportsResults?.game_spotlight) return json.sportsResults.game_spotlight;
		if (json.knowledgeGraph?.description) return json.knowledgeGraph.description;
		if (json.organic?.[0]?.snippet) return json.organic[0].snippet;
		return "No good search result found";
	}
	description = "a search engine. useful for when you need to answer questions about current events. input should be a search query.";
};

//#endregion
exports.Serper = Serper;
Object.defineProperty(exports, 'serper_exports', {
  enumerable: true,
  get: function () {
    return serper_exports;
  }
});
//# sourceMappingURL=serper.cjs.map