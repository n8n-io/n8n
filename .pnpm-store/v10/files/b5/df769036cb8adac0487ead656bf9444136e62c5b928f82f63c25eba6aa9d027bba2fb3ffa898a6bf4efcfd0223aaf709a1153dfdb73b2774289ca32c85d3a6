const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));

//#region src/tools/aiplugin.ts
var aiplugin_exports = {};
require_rolldown_runtime.__export(aiplugin_exports, { AIPluginTool: () => AIPluginTool });
/**
* Class for creating instances of AI tools from plugins. It extends the
* Tool class and implements the AIPluginToolParams interface.
*/
var AIPluginTool = class AIPluginTool extends __langchain_core_tools.Tool {
	static lc_name() {
		return "AIPluginTool";
	}
	_name;
	_description;
	apiSpec;
	get name() {
		return this._name;
	}
	get description() {
		return this._description;
	}
	constructor(params) {
		super(params);
		this._name = params.name;
		this._description = params.description;
		this.apiSpec = params.apiSpec;
	}
	/** @ignore */
	async _call(_input) {
		return this.apiSpec;
	}
	/**
	* Static method that creates an instance of AIPluginTool from a given
	* plugin URL. It fetches the plugin and its API specification from the
	* provided URL and returns a new instance of AIPluginTool with the
	* fetched data.
	* @param url The URL of the AI plugin.
	* @returns A new instance of AIPluginTool.
	*/
	static async fromPluginUrl(url) {
		const aiPluginRes = await fetch(url);
		if (!aiPluginRes.ok) throw new Error(`Failed to fetch plugin from ${url} with status ${aiPluginRes.status}`);
		const aiPluginJson = await aiPluginRes.json();
		const apiUrlRes = await fetch(aiPluginJson.api.url);
		if (!apiUrlRes.ok) throw new Error(`Failed to fetch API spec from ${aiPluginJson.api.url} with status ${apiUrlRes.status}`);
		const apiUrlJson = await apiUrlRes.text();
		return new AIPluginTool({
			name: aiPluginJson.name_for_model,
			description: `Call this tool to get the OpenAPI spec (and usage guide) for interacting with the ${aiPluginJson.name_for_human} API. You should only call this ONCE! What is the ${aiPluginJson.name_for_human} API useful for? ${aiPluginJson.description_for_human}`,
			apiSpec: `Usage Guide: ${aiPluginJson.description_for_model}

OpenAPI Spec in JSON or YAML format:\n${apiUrlJson}`
		});
	}
};

//#endregion
exports.AIPluginTool = AIPluginTool;
Object.defineProperty(exports, 'aiplugin_exports', {
  enumerable: true,
  get: function () {
    return aiplugin_exports;
  }
});
//# sourceMappingURL=aiplugin.cjs.map