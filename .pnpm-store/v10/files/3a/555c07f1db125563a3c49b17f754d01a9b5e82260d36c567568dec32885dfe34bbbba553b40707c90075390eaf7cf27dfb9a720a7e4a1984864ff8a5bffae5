const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));

//#region src/tools/dadjokeapi.ts
var dadjokeapi_exports = {};
require_rolldown_runtime.__export(dadjokeapi_exports, { DadJokeAPI: () => DadJokeAPI });
/**
* The DadJokeAPI class is a tool for generating dad jokes based on a
* specific topic. It fetches jokes from an external API and returns a
* random joke from the results. If no jokes are found for the given
* search term, it returns a message indicating that no jokes were found.
*/
var DadJokeAPI = class extends __langchain_core_tools.Tool {
	static lc_name() {
		return "DadJokeAPI";
	}
	name = "dadjoke";
	description = "a dad joke generator. get a dad joke about a specific topic. input should be a search term.";
	/** @ignore */
	async _call(input) {
		const headers = { Accept: "application/json" };
		const searchUrl = `https://icanhazdadjoke.com/search?term=${input}`;
		const response = await fetch(searchUrl, { headers });
		if (!response.ok) throw new Error(`HTTP error ${response.status}`);
		const data = await response.json();
		const jokes = data.results;
		if (jokes.length === 0) return `No dad jokes found about ${input}`;
		const randomIndex = Math.floor(Math.random() * jokes.length);
		const randomJoke = jokes[randomIndex].joke;
		return randomJoke;
	}
};

//#endregion
exports.DadJokeAPI = DadJokeAPI;
Object.defineProperty(exports, 'dadjokeapi_exports', {
  enumerable: true,
  get: function () {
    return dadjokeapi_exports;
  }
});
//# sourceMappingURL=dadjokeapi.cjs.map